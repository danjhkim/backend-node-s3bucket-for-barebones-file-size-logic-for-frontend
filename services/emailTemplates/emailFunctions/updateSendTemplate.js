const AWS = require('aws-sdk');

AWS.config.update({
	region: 'us-east-2',
});

const ses = new AWS.SES({ apiVersion: '2010-12-01' });

//For First Template
const params = {
	TemplateName: 'EmailVerify',
	// SubjectPart: 'Retrive Password',
	// HtmlPart:
	// 	"<html> <body><div style='text-align: center;'> <h3>Reset your password.</h3><p>Click this link to reset your password</p><div><a href={{link}}>{{link}}</a></div></div></body></html>",
};

//! add
// const response = ses.updateTemplate(params, (err, data) => {
// 	if (err) {
// 		console.log(err, err.stack); // an error occurred
// 	} else {
// 		console.log(data); // successful response
// 	}
// });

//! delete
// const response = ses.getTemplate(params, (err, data) => {
// 	if (err) {
// 		console.log(err, err.stack); // an error occurred
// 	} else {
// 		console.log(data); // successful response
// 	}
// });

//! list
var lister = {
	MaxResults: 100,
	NextToken: 'created',
};
ses.listCustomVerificationEmailTemplates(lister, function (err, data) {
	if (err) console.log(err, err.stack); // an error occurred
	else console.log(data); // successful response
});
