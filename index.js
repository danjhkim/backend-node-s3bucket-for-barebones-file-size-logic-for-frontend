const express = require('express');
const morgan = require('morgan');
var cookieParser = require('cookie-parser');
const session = require('express-session');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const app = express();
const passport = require('passport');

if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config();
}

var whitelist = ['http://localhost:3000', 'http://localhost:3093'];

var corsOptions = {
	origin: function (origin, callback) {
		if (whitelist.indexOf(origin) !== -1 || !origin) {
			callback(null, true);
		} else {
			callback(new Error('Not allowed by CORS'));
		}
	},
	credentials: true,
};

app.set('trust proxy', true);

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 1000, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
	standardHeaders: true,
	legacyHeaders: false,
});

//Configure session middleware

app.use(helmet());

app.use(cors(corsOptions));

// mongo connect
mongoose.set('strictQuery', false);
mongoose
	.connect(process.env.MONGO_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(result => console.log('connected to db'))
	.catch(err => console.log(err));

// app.use(function (req, res, next) {
// 	res.setHeader(
// 		'Content-Security-Policy',
// 		"default-src 'self'; font-src 'self'; img-src 'self'; script-src 'self' 'https://apis.google.com' ; style-src 'self'; frame-src 'self'",
// 	);
// 	res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
// 	next();
// });

app.use(limiter);

app.use(morgan('combined'));

app.use(express.json());

app.use(
	session({
		secret: process.env.COOKIE_KEY,
		resave: false,
		saveUninitialized: true,
		cookie: { secure: true },
	}),
);
app.use(cookieParser(process.env.COOKIE_KEY));

app.use(passport.initialize());
app.use(passport.session());

const routes = require('./routes/router');

app.use(routes);

if (process.env.NODE_ENV === 'production') {
	const path = require('path');

	app.use(express.static('../client/build'));

	app.get('*', (req, res) => {
		res.sendFile(
			path.resolve(__dirname, '..', 'client', 'build', 'index.html'),
		);
	});
}

//Server setup
const PORT = process.env.PORT || 3093;

app.listen(PORT, () => {
	console.log(`Listening port ${PORT}`);
});
