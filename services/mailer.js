const { ses } = require('./aws');

const createSendEmailCommand = async (
	emailTo,
	emailFrom,
	link,
	templatename,
) => {
	try {
		const params = {
			Destination: {
				ToAddresses: [emailTo],
			},
			Source: emailFrom,
			Template: templatename,
			TemplateData: JSON.stringify({
				link: link,
			}),
		};
		const sendEmailReceiver = ses.sendTemplatedEmail(params).promise();
		sendEmailReceiver
			.then(data => {
				console.log(emailFrom, emailTo);
				console.log('Email submitted to SES', data);
			})
			.catch(error => {
				console.log('Email not submitted to SES:' + error);
			});
	} catch (err) {
		console.error(`Error: ${e}`);
	}
};

module.exports = {
	createSendEmailCommand,
};
