const AWS = require('aws-sdk');

AWS.config.update({
	region: 'us-east-2', //Specify your region
});

const ses = new AWS.SES();
/* ==================Create Template=================*/

const params = {
	Template: {
		TemplateName: 'PasswordForgot',
		SubjectPart: 'Retrive Password',
		HtmlPart:
			"<html> <body><div style='text-align: center;'> <h3>Reset your password.</h3><p>Click this link to reset your password</p><div><a href={{link}}>{{link}}</a></div></div></body></html>",
	},
};

ses.createTemplate(params, (err, data) => {
	if (err) console.log(err, err.stack); // an error occurred
	else console.log(data); // successful response
});
