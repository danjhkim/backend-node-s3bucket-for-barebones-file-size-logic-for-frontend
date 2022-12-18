const fs = require('fs');
const aws = require('aws-sdk');

if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config();
}

const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

aws.config.update({
	region,
	accessKeyId,
	secretAccessKey,
	apiVersion: '2006-03-01',
});

// Create an Amazon S3 service client object.
const s3 = new aws.S3();

const bucketName = process.env.AWS_BUCKET_NAME;

// uploads a file to s3

async function uploadFile(file) {
	const fileStream = fs.createReadStream(file.path);

	console.log();

	const uploadParams = {
		Bucket: bucketName,
		Body: fileStream,
		Key: file.originalname,
		ContentType: file.originalname,
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
