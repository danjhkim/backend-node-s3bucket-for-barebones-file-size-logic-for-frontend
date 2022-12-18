const express = require('express');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const keys = require('./keys');
const multer = require('multer');
const fs = require('fs');
const util = require('util');
const unlinkFile = util.promisify(fs.unlink);
const app = express();
const { uploadFile, getFile, listFiles } = require('./s3');
const upload = multer({ dest: 'uploads/' });

if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config();
}

var whitelist = [
	'http://localhost:3000',
	'http://localhost:3001',
	'http://localhost:3095',
	'http://localhost:3093',
];

var corsOptions = {
	origin: function (origin, callback) {
		if (whitelist.indexOf(origin) !== -1 || !origin) {
			callback(null, true);
		} else {
			callback(new Error('Not allowed by CORS'));
		}
	},
};

// whitelist.indexOf(origin) !== -1  is the same as whitelist.includes(origin)

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use(helmet());

app.use(cors(corsOptions));

//! needed for auth not cofigured
// mongoose
// 	.connect(keycon.mongoURI, {
// 		useNewUrlParser: true,
// 		useUnifiedTopology: true,
// 	})
// 	.then(result => console.log('connected to db'))
// 	.catch(err => console.log(err));

//middlewares

//! this is for CSRF so you cant make requests through unauthorized links
app.use(function (req, res, next) {
	res.setHeader(
		'Content-Security-Policy',
		"default-src 'self'; font-src 'self'; img-src 'self'; script-src 'self' 'https://apis.google.com' ; style-src 'self'; frame-src 'self'",
	);
	next();
});

app.use(limiter);

app.use(morgan('combined'));

app.use(express.json());

app.use(cookieParser(keys.cookieKey));
//cookie pareser is outdated u can use
// express-session
// const routes = require('./routers/router');

// if (process.env.NODE_ENV === 'production') {
// 	//! only production cuz development u dont wanna constantly build you just run dev on client and setup a proxy
// 	//if in production and the routes arent in authroutes anb billingroutes check react
// 	const path = require('path');

// 	// serve production assets e.g. main.js if route exists
// 	// //! checking reach folders
// 	app.use(express.static('../client/build'));

// 	// serve index.html if route is not recognized
// 	// //! if not found just send the index.html
// 	app.get('*', (req, res) => {
// 		res.sendFile(
// 			path.resolve(__dirname, '..', 'client', 'build', 'index.html'),
// 		);
// 	});
// }
{
	/* <a href={`${API_URL}/files/${upload.filename}`}> */
}

//list files immediately from bucket
app.get('/list', async (req, res, next) => {
	try {
		let list = await listFiles();
		res.status(200).send({
			message: 'List downloaded!',
			status: 200,
			list: list,
		});
	} catch (err) {
		res.status(500).send({
			message: 'Error!',
			err,
		});
	}
});

app.get('/download/:key', async (req, res, next) => {
	try {
		const key = req.params.key;
		const data = await getFile(key);
		res.setHeader('Content-Disposition', `attachment; filename=${key}`);

		data.pipe(res);
	} catch (err) {
		res.status(500).send({
			message: 'Error!',
			err,
		});
	}
});

app.post('/upload', upload.single('file'), async (req, res, next) => {
	const file = req.file;
	try {
		await uploadFile(file);

		res.status(200).send({
			message: 'Uploaded!',
			originalname: file.originalname,
			url: file.destination,
			name: file.filename,
			type: file.mimetype,
			size: file.size,
			status: 200,
		});
		await unlinkFile(file.path);
	} catch (err) {
		res.status(500).send({
			message: 'Error!',
			err,
		});
		await unlinkFile(file.path);
	}
});

//Server setup
const PORT = process.env.PORT || 3093;

app.listen(PORT, () => {
	console.log(`Listening port ${PORT}`);
});
