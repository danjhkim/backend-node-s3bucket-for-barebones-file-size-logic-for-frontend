const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
	googleId: {
		type: String,
		required: true,
	},
});

const GoogleUser = mongoose.model('GoogleUser', userSchema);

module.exports = GoogleUser;
