const aws = require('aws-sdk');

if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config();
}

const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const sesAccessKey = process.env.AWS_ACCESS_KEY_ID5;
const sesSecretKey = process.env.AWS_SECRET_ACCESS_KEY5;

const S3_CONFIG = {
	accessKeyId: accessKeyId,
	secretAccessKey: secretAccessKey,
	region: region,
	apiVersion: '2006-03-01',
};

const SES_CONFIG = {
	accessKeyId: sesAccessKey,
	secretAccessKey: sesSecretKey,
	region: region,
};

const s3 = new aws.S3(S3_CONFIG);
const ses = new aws.SES(SES_CONFIG);

module.exports = {
	ses,
	s3,
};
