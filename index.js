const express = require('express');
const app = express();
const monk = require('monk');
const helpers = require('./serverHelpers.js')
const db = monk("localhost:27017/registermate");
const bodyParser = require("body-parser");
const cookieSession = require('cookie-session');
const hbs = require('hbs');
const nodemailer = require('nodemailer');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cookieSession({
	name: 'session',
	keys: ["myfirstkey"],

	// Cookie Options
	maxAge: 24 * 60 * 60 * 1000 // 24 hours
}))

db.then(() => {
	console.log('Connected correctly to server')
})

const users = db.get('users')
const students = db.get('students')

app.set('view engine', 'hbs');
hbs.registerPartials(__dirname + '/templates');

var transporter;

nodemailer.createTestAccount((err, account) => {

	// init reusable transporter object using the default SMTP transport
	transporter = nodemailer.createTransport({
			host: 'smtp.ethereal.email',
			port: 587,
			secure: false, // true for 465, false for other ports
			auth: {
					user: account.user, // generated ethereal user
					pass: account.pass  // generated ethereal password
			}
	});
})

app.use("/libs",express.static(__dirname + '/libs'));
app.use("/clientscripts",express.static(__dirname + '/clientscripts'));

app.get('/', (req, res) => res.redirect('/student'))
app.get('/student', (req, res) => res.render(__dirname + '/templates/student.hbs'))
app.get('/teacher', (req, res) =>
	{

		if (req.session.username != null && req.session.password != null)
		{
				// Already logged in.
				if(req.session.role == "teacher")
				{
					res.render(__dirname + '/templates/teacherMenu.hbs');
				}
				else
				{
					res.render(__dirname + '/templates/adminMenu.hbs');
				}
		}
		else
		{
			res.render(__dirname + '/templates/login.hbs');
		}
	}
)

app.get('/registeraccount', (req, res) =>{
	res.render(__dirname + '/templates/registerAccount.hbs');
})

app.get('/requestreset', (req, res) =>{
	res.render(__dirname + '/templates/requestReset.hbs');
})

app.post('/createaccount', (req, res) =>
{

	var ud;
	helpers.saltAndHash(req.body.password1)

	.then(function(data)
	{
		ud = {
			username: req.body.username,
			password: req.body.password1,
			hash: data,
			role: "teacher",
			email: req.body.email
		}

		return users.count()

	})

	.then((doc) => {

		//first user becomes an admin automatically
		if(doc == 0)
		{
			ud.role = "admin";
		}

		//check for existing username
		return users.findOne({username: req.body.username});
	})

	.then((doc) =>
	{

		if(doc == null)
		{
			users.insert(ud);
			if(!req.session.username && !req.session.password)
			{
				//if not logged in then login and redirect ...
				req.session.username = ud.username;
				req.session.password = ud.password;
				req.session.role = ud.role;
				res.redirect('/teacher');
			}
			else
			{
				res.status(200).send('Account created');
			}
		}
		else
		{
			res.status(400).send('A user of that name already exists');
		}
	})
})

app.post('/makeadmin', (req, res) =>{

	//A valid admin user can make another user into an admin

	var auth = {
		username: req.session.username,
		password: req.session.password
	}

	helpers.authenticateUser(auth, users, true)

	.then(function(data){

		if(data.valid)
		{
			//change user role here
		}
		else
		{
			res.status(400).send(data.info);
		}
	})

})

app.post('/login', (req, res) =>
	{
		if(req.session.username != null && req.session.password != null)
		{
			res.redirect("/teacher")
		}
		else
		{
			//check database
			helpers.authenticateUser(req.body, users, false)

			.then((data)=>{
				if(data.valid)
				{
					req.session.username = req.body.username;
					req.session.password = req.body.password;
					res.redirect('/teacher');
				}
				else
				{
					res.status(400).send(data.info);
				}
			})
		}
	}
)

app.get('/logout', (req, res) => {
	req.session = null;
	res.redirect('/teacher');
})

app.post('/emailreset', (req, res) =>
{
	users.findOne({username: req.body.username})
	.then((doc) =>{

		if(doc == null)
		{
			return Promise.reject("User not found");
		}
		else
		{
			//send the email

			var mail =
			{
				from: '"noreply" <noreply@registermate.doc.gold.ac.uk>', // sender address
				to: 'bar@blurdybloop.com', // list of receivers
				subject: 'Registermate', // Subject line
				text: 'password reset', // plain text body
				html: '<b>Message text</b>' // html body
			};

			// send mail with defined transport object
			return transporter.sendMail(mail, (error, info) =>
			{
				if (error)
				{
					return console.log(error);
				}
				console.log('Message sent: %s', info.messageId);
				// Preview only available when sending through an Ethereal account
				console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
			});


		}
	})
	.then((doc)=>{
		res.send("A email has been sent to your registered address.")
	})
	.catch((doc) => {
		console.log(doc);
		res.send(doc)
	})

})

app.get('/reset/:token', (req, res) => {

	var token = req.params.token;

})


app.listen(3000, () => console.log('Example app listening on port 3000!'))
