const passport = require('passport');
const passportCustom = require('passport-custom');
const ExtractJwt = require('passport-jwt').ExtractJwt;
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const GoogleUser = require('../models/GoogleUser');
const JwtStrategy = require('passport-jwt').Strategy;
const CustomStrategy = passportCustom.Strategy;
const LocalStrategy = require('passport-local');
const { redisClient } = require('./redis');
var GoogleStrategy = require('passport-google-oauth20').Strategy;

//! for google auth
passport.serializeUser((user, done) => {
	done(null, user.id);
});

passport.deserializeUser((id, done) => {
	GoogleUser.findById(id)
		.then(user => {
			done(null, user);
		})
		.catch(err => {
			console.log(err);
		});
});

const googleOptions = {
	clientID: process.env.GOOGLE_CLIENT_ID,
	clientSecret: process.env.GOOGLE_CLIENT_SECRET,
	callbackURL: '/auth/google/callback',
	proxy: true,
	passReqToCallback: true,
};

//Create Google strategy
const googleLogin = new GoogleStrategy(
	googleOptions,
	async (req, accessToken, refreshToken, profile, cb) => {
		const existingUser = await GoogleUser.findOne({ googleId: profile.id });
		if (existingUser) {
			cb(null, existingUser);
		} else {
			const user = await new GoogleUser({ googleId: profile.id }).save();
			cb(null, user);
		}
	},
);

//Create local strategy
const localOptions = { usernameField: 'username' };
// when u want username just use email
const localLogin = new LocalStrategy(
	localOptions,
	async (username, password, done) => {
		// Check record has same username as you are using in find
		try {
			if (username && password) {
				User.comparePassword(
					username,
					password,
					async function (err, isMatch, user) {
						if (err) {
							return done(err);
						}
						if (!isMatch) {
							return done(null, false);
						}
						if (isMatch && user.verified) {
							return done(null, user);
						} else {
							return done('Account is not verified', false);
						}
					},
				);
			}
		} catch (err) {
			return done(err, false);
		}
	},
);

const jwtOptions = {
	jwtFromRequest: req => req.signedCookies['jwt'],
	secretOrKey: process.env.SECRETJWT,
	ignoreExpiration: true,
	passReqToCallback: true,
};

const jwtLogin = new JwtStrategy(jwtOptions, async (req, payload, done) => {
	const findUser = async user => {
		const existingUser = await User.findById(user.sub);
		const googleUser = await GoogleUser.findById(user.sub);

		if (existingUser) {
			done(null, existingUser);
		} else if (googleUser) {
			done(null, googleUser);
		} else {
			done('AUTH FAILED', false);
		}
	};
	let current_time = Date.now().valueOf() / 1000;

	try {
		//if token is expired use the token and check with refresh token to see if match
		if (payload.exp < current_time) {
			await redisClient.connect();
			const value = await redisClient.hGet(payload.sub, 'refreshToken');
			await redisClient.disconnect();

			token = JSON.parse(value);

			!token
				? done(
						'REFRESH TOKEN DOES NOT EXIST PLEASE LOG IN USING YOUR USERNAME AND PASSWORD',
						false,
				  )
				: null;

			jwt.verify(
				token.refresh,
				process.env.SECRETJWT,
				async (err, tokenDetails) => {
					if (err) {
						done(err, null);
					}
					if (
						//if the expired access token matches the access token in redis
						// AND if the if matches in the refresh token and the client side access token
						// RESEND TOKENS
						token.access === req.signedCookies.jwt &&
						tokenDetails.sub === payload.sub
					) {
						findUser(tokenDetails);
					}
				},
			);
		} else {
			findUser(payload, false);
		}
	} catch (err) {
		return done(err);
	}
});

const accountVerify = new CustomStrategy(async (payload, done) => {
	// if it exists search db for specific ID
	if (!payload.query.id) {
		done('ID NOT FOUND', false);
	}

	try {
		jwt.verify(
			payload.query.id,
			process.env.HASH_ID_EMAIL_CONFIRM,
			async (err, tokenDetails) => {
				if (err) {
					done(err, null);
				} else {
					await redisClient.connect();
					const value = await redisClient.hGet(
						'emailLinks',
						JSON.stringify(tokenDetails.sub),
					);
					if (value) {
						await redisClient.hDel(
							'emailLinks',
							JSON.stringify(tokenDetails.sub),
							async function (err, data) {
								if (err) {
									await redisClient.disconnect();
								} else {
									console.log(data, 'data');
								}
							},
						);
						await redisClient.disconnect();
						const existingUser = await User.findById(
							tokenDetails.sub,
						);
						if (existingUser) {
							existingUser.verified = true;
							await existingUser.save();
							done(null, existingUser);
						} else {
							done(null, false);
						}
					} else {
						await redisClient.disconnect();
						done(null, 'expired');
					}
				}
			},
		);
	} catch (err) {
		return done('UNABLE TO VERIFY TOKEN', false);
	}
});

//Tell passport to use this strategy
passport.use(jwtLogin);
passport.use(localLogin);
passport.use(accountVerify);
passport.use(googleLogin);
