const fs = require('fs');
const { s3 } = require('./aws');

if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config();
}

// Create an Amazon S3 service client object.

const bucketName = process.env.AWS_BUCKET_NAME;

// uploads a file to s3

async function uploadFile(file) {
	const fileStream = fs.createReadStream(file.path);

	const uploadParams = {
		Bucket: bucketName,
		Body: fileStream,
		Key: file.originalname,
	};

	try {
		const data = s3.upload(uploadParams).promise();
		return data; // For unit tests.
	} catch (err) {
		throw err;
	}
}

exports.uploadFile = uploadFile;

// downloads a file from s3
async function getFile(fileKey) {
	const downloadParams = {
		Key: fileKey,
		Bucket: bucketName,
	};

	try {
		// Get the object} from the Amazon S3 bucket. It is returned as a ReadableStream.
		const data = s3.getObject(downloadParams).createReadStream();
		return data;
	} catch (err) {
		throw err;
	}
}

exports.getFile = getFile;

// delete a file from s3
async function deleteFile(fileKey) {
	const downloadParams = {
		Key: fileKey,
		Bucket: bucketName,
	};

	try {
		// Get the object} from the Amazon S3 bucket.
		const data = s3.deleteObject(downloadParams).promise();
		return data;
	} catch (err) {
		throw err;
	}
}

exports.deleteFile = deleteFile;

// list  a files from s3

async function listFiles() {
	const listParams = {
		Bucket: bucketName,
	};

	try {
		const data = s3.listObjects(listParams).promise();
		return data;
	} catch (err) {
		throw err;
	}
}

exports.listFiles = listFiles;
