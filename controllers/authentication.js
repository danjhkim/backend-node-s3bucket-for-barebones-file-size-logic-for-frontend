const validator = require('email-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { redisClient } = require('../services/redis');
const { createSendEmailCommand } = require('../services/mailer');
const bcrypt = require('bcrypt');

// function that creates jwt token using hashed user id from mongodb
// RSA algoritm required private and public key
function tokenForUser(user, expires) {
	return jwt.sign(
		{ sub: user.id, iat: Math.floor(Date.now().valueOf() / 1000) },
		process.env.SECRETJWT,
		{
			algorithm: 'HS256',
			expiresIn: expires,
		},
	);
}

function hashIDForEmailConfirmation(id, expires) {
	return jwt.sign(
		{ sub: id, iat: Math.floor(Date.now().valueOf() / 1000) },
		process.env.HASH_ID_EMAIL_CONFIRM,
		{
			algorithm: 'HS256',
			expiresIn: expires,
		},
	);
}

async function cacheEmailLink(id, expires) {
	try {
		await redisClient.connect();
		// false means it has not been used
		//upon first use we will delete from redis cache
		await redisClient.hSet('emailLinks', JSON.stringify(id), 'true', {
			EX: expires,
		});
		await redisClient.disconnect();
	} catch (err) {
		throw err;
	}
}

async function setRefreshToken(id, accessToken, refeshToken) {
	//if key exists it is overridden which resets refresh token in cache
	try {
		await redisClient.connect();
		//save in redis cache but have the key expire in 8 days (ensuring we don't have expired refresh tokens taking up space)
		await redisClient.hSet(
			id,
			'refreshToken',
			JSON.stringify({ access: accessToken, refresh: refeshToken }),
			{
				EX: 60 * 60 * 168,
			},
		);
		await redisClient.disconnect();
	} catch (err) {
		throw err;
	}
}

async function clearRefreshToken(user) {
	// if key exists it is overridden which resets refresh token in cache
	try {
		jwt.verify(user, process.env.SECRETJWT, async (err, tokenDetails) => {
			if (err) {
				throw err;
			}
			await redisClient.connect();
			await redisClient.del(tokenDetails.sub, function (err, data) {
				console.log(data, 'data');
			});
			await redisClient.disconnect();
		});
	} catch (err) {
		throw err;
	}
}

async function passwordHasher(password, user) {
	bcrypt.genSalt(10, function async(err, salt) {
		if (err) {
			throw err;
		}

		// hash (encrypt) our password using the salt
		bcrypt.hash(password, salt, function (err, hash) {
			if (err) {
				throw err;
			}
			user.password = hash;
			user.save();
		});
	});
}

async function sendverification(user, req, res, emailType) {
	let confirmUser;
	if (req.body.email) {
		confirmUser = await User.findOne({ email: req.body.email });
	} else if (user) {
		confirmUser = await User.findOne({ email: user.email });
	}
	if (confirmUser) {
		let hashedID = hashIDForEmailConfirmation(confirmUser.id, '24h');
		//let jwt expire in 24 if email link isnt clicked before then, its invalid.
		const link = `http://localhost:3093/${emailType}?id=${hashedID}`;

		try {
			const send = await createSendEmailCommand(
				confirmUser.email,
				'danjhkim@gmail.com',
				link,
				emailType,
			);

			await cacheEmailLink(confirmUser.id, '24h');
			res.status(200).json({
				success: 'EMAIL SENT',
			});
		} catch (err) {
			res.status(500).send('FAILED TO RESEND VERIFICATION EMAIL');
		}
	} else {
		res.status(500).json({
			success: 'NO SUCH USER EXISTS WITH THOSE CREDENTIALS',
		});
	}
}

const signin = async (req, res, next) => {
	let accessToken = tokenForUser(req.user, '1h');
	let refeshToken = tokenForUser(req.user, '7d');
	try {
		await setRefreshToken(req.user.id, accessToken, refeshToken);
		res.cookie('jwt', accessToken, {
			httpOnly: true,
			secure: false, //! set to true for production
			signed: true,
			expires: new Date(Date.now() + 8 * 3600000),
		})
			.status(200)
			.json({
				success: 'Logged in successfully 😊 👌',
				email: req.user.email,
			});
	} catch (err) {
		res.status(500).send('FAILED TO SAVE TOKENS TO CACHE AND COOKIE');
	}
};

const signout = async (req, res, next) => {
	// console.log(req.signedCookies.jwt, 'hmm?');
	// if (req.signedCookies.jwt) {
	// 	const user = req.signedCookies.jwt;
	// 	await clearRefreshToken(user);
	// }
	req.logout();
	res.clearCookie('jwt', { path: '/' });
	res.send({
		status: 200,
		message: 'User logged out successfully',
		redirect_path: '/',
	});
};

const checkuser = async (req, res, next) => {
	let accessToken = tokenForUser(req.user, '1hr');

	try {
		res.cookie('jwt', accessToken, {
			httpOnly: true,
			secure: false, //! set to true for production
			signed: true,
			expires: new Date(Date.now() + 8 * 3600000),
		});

		res.json({
			success: 'User is currently logged in..',
			email: req.user.email,
		}).status(200);
	} catch (err) {
		res.status(500).send('FAILED TO SEND TOKEN');
	}
};

const signup = async (req, res, next) => {
	const email = req.body.email;
	const username = req.body.username;
	const password = req.body.password;

	// sending error code if all parameters are not filled
	if (!email || !username || !password || !validator.validate(email)) {
		return res.status(422).send({
			error: 'You must provide a proper email, username, and password',
		});
	}
	//see if user exists
	let existingUser = await User.findOne({ username: username });
	let existingEmail = await User.findOne({ email: email });

	if (existingUser || existingEmail) {
		res.status(422).send({ error: 'Username or Email is in use' });
	} else {
		try {
			// if new user, create and save user record
			const user = await new User({
				email: email,
				username: username,
				password: password,
			}).save();

			sendverification(user, req, res, 'emailverify');
		} catch (err) {
			res.status(500).send(
				'FAILED TO SAVE TOKENS TO CACHE AND COOKIE',
				err,
			);
		}
	}
};

const verified = async (req, res, next) => {
	if (req.user === 'expired') {
		res.status(300);
		res.redirect('http://localhost:3000/resendmail');
	} else {
		try {
			let accessToken = tokenForUser(req.user, '1h');
			let refeshToken = tokenForUser(req.user, '7d');
			await setRefreshToken(req.user.id, accessToken, refeshToken);
			res.cookie('jwt', accessToken, {
				httpOnly: true,
				secure: false, //! set to true for production
				signed: true, //!set to true for production
				//8 hrs
				expires: new Date(Date.now() + 8 * 3600000),
			});
			res.redirect('http://localhost:3000/complete');
		} catch (err) {
			res.status(500).send('FAILED TO SAVE TOKENS TO CACHE AND COOKIE');
		}
	}
};

const resendmail = async (req, res, next) => {
	try {
		sendverification(null, req, res, 'emailverify');
	} catch (err) {
		res.status(500).send('FAILED TO RESEND VERIFICATION EMAIL');
	}
};

const passwordLink = async (req, res, next) => {
	try {
		sendverification(null, req, res, 'passwordforgot');
	} catch (err) {
		res.status(500).send('FAILED TO RESEND VERIFICATION EMAIL');
	}
};

const verifypassword = async (req, res, next) => {
	if (req.user === 'expired') {
		res.status(300);
		res.redirect('http://localhost:3000/resendpassemail');
		//need an password error route CLIENT SIDE
		//! CREATE LATER
	} else {
		try {
			console.log('verifyed pass email');
			let accessToken = tokenForUser(req.user, '1h');
			let refeshToken = tokenForUser(req.user, '7d');
			console.log(req.user.id, 'not expired');
			await setRefreshToken(req.user.id, accessToken, refeshToken);
			res.cookie('jwt', accessToken, {
				httpOnly: true,
				secure: false, //! set to true for production
				signed: true,
				expires: new Date(Date.now() + 8 * 3600000),
			});
			res.status(200);
			res.redirect('http://localhost:3000/passchange');
		} catch (err) {
			res.status(500).send('FAILED TO VERIFY USER');
		}
	}
};

const resetpass = async (req, res, next) => {
	const password = req.body.password;

	// sending error code if both parameters are not filled
	if (!password) {
		return res.status(422).send({
			error: 'Enter a password',
		});
	}
	try {
		let existingUser = await User.findById(req.user.id);
		if (existingUser) {
			await passwordHasher(password, existingUser);
			console.log('bro');

			res.status(200);
			res.send({ success: 'updated password' });
		} else {
			res.json({
				fail: 'Update has failed',
			}).status(500);
		}
	} catch (err) {
		res.status(500).send('FAILED TO RESET PASSWORD');
	}
};

module.exports = {
	signup,
	signin,
	checkuser,
	signout,
	verified,
	resendmail,
	passwordLink,
	verifypassword,
	resetpass,
};
