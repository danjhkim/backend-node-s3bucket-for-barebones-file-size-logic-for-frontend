const fs = require('fs');
const util = require('util');
const unlinkFile = util.promisify(fs.unlink);
const {
	uploadFile,
	getFile,
	listFiles,
	deleteFile,
} = require('../services/s3');

const list = async (req, res, next) => {
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
};

const download = async (req, res, next) => {
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
};

const upload = async (req, res, next) => {
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
};

const deleter = async (req, res, next) => {
	const key = req.params.key;
	try {
		await deleteFile(key);

		res.status(200).send({
			message: 'Deleted!',
			status: 200,
		});
	} catch (err) {
		res.status(500).send({
			message: 'Error!',
			err,
		});
	}
};

module.exports = {
	list,
	download,
	upload,
	deleter,
};
