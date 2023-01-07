const mongoose = require('mongoose');
const { Schema } = mongoose;
const bcrypt = require('bcrypt');

const userSchema = new Schema({
	email: {
		type: String,
		required: true,
		unique: true,
		lowercase: true,
	},
	username: {
		type: String,
		required: true,
		unique: true,
		lowercase: true,
	},
	password: {
		type: String,
		required: true,
	},
	verified: {
		type: Boolean,
		default: false,
		required: true,
	},
});

// On Save Hook, encrypt password
// Before saving a model, run this function
userSchema.pre('save', function (next) {
	if (this.isNew) {
		// get access to the user model
		const user = this;

		// generate a salt then run callback
		bcrypt.genSalt(10, function (err, salt) {
			if (err) {
				return next(err);
			}

			// hash (encrypt) our password using the salt
			bcrypt.hash(user.password, salt, function (err, hash) {
				if (err) {
					return next(err);
				}

				// overwrite plain text password with encrypted password FOR MONGO
				user.password = hash;
				next();
			});
		});
	} else {
		next();
	}
});

userSchema.statics.comparePassword = function (
	username,
	candidatePassword,
	callback,
) {
	let criteria = {
		$or: [{ username: username }, { email: username }],
	};

	this.findOne(criteria, function (err, user) {
		if (user) {
			bcrypt.compare(
				candidatePassword,
				user.password,
				function (err, isMatch) {
					if (err) {
						return callback(err);
					}
					callback(null, isMatch, user);
				},
			);
		} else {
			throw err;
		}
	});
};

const User = mongoose.model('User', userSchema);

module.exports = User;
