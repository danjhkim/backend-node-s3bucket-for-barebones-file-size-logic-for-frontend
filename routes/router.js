const express = require('express');
const router = express.Router();
const Authentication = require('../controllers/authentication');
const Filefunctions = require('../controllers/filefunctions');
require('../services/passport');
const passport = require('passport');
const multer = require('multer');
const upload = multer({ dest: '/uploads/' });

const requireAuth = passport.authenticate('jwt', { session: false });
const requireSignin = passport.authenticate('local', { session: false });
const accountVerify = passport.authenticate('custom', { session: false });
const googleAuth = passport.authenticate('google', {
	scope: ['profile', 'email'],
	prompt: 'select_account',
	failureRedirect: '/',
});

//test route
router.get('/test', function (req, res) {
	res.send({ hi: 'there' });
});

router.get('/auth/google', googleAuth);

router.get(
	'/auth/google/callback',
	passport.authenticate('google'),
	Authentication.signin,
);

router.post('/signup', Authentication.signup);
router.get('/emailverify', accountVerify, Authentication.verified);
router.post('/resendmail/send', Authentication.resendmail);

router.post('/signin', requireSignin, Authentication.signin);
router.get('/usercheck', requireAuth, Authentication.checkuser);

//send email verification if forgot password
router.post('/emailverifypassword', Authentication.passwordLink);
//email link redirects here to confirm email, then redirect to protected form route
router.get('/passwordforgot', accountVerify, Authentication.verifypassword);
//final api call to change password, route to homepage
router.post('/resetpass', requireAuth, Authentication.resetpass);

router.get('/signout', Authentication.signout);

//s3 bucket routes
router.get('/list', requireAuth, Filefunctions.list);
router.get('/download/:key', requireAuth, Filefunctions.download);
router.post(
	'/upload',
	requireAuth,
	upload.single('file'),
	Filefunctions.upload,
);
router.get('/delete/:key', requireAuth, Filefunctions.deleter);

module.exports = router;
