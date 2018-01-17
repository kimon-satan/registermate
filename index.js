const express = require('express');
const app = express();
const monk = require('monk');
const helpers = require('./serverHelpers.js')
const db = monk("localhost:27017/registermate");
const bodyParser = require("body-parser");
const cookieSession = require('cookie-session');
const hbs = require('hbs');
const nodemailer = require('nodemailer');
const accounts = require('./accounts.js');
const sessionManager = require('./sessionmanager.js');
const argv = require('yargs').argv;

const PORT = 8000;
global.URL = "http://doc.gold.ac.uk/usr/215"
//global.URL = "";

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

app.transporter = "";

nodemailer.createTestAccount((err, account) => {

	if(err)
	{
		console.log(err);
		return Promise.reject();
	}
	else
	{
		// init reusable transporter object using the default SMTP transport
		app.transporter = nodemailer.createTransport({
				host: 'smtp.ethereal.email',
				port: 587,
				secure: false, // true for 465, false for other ports
				auth: {
						user: account.user, // generated ethereal user
						pass: account.pass  // generated ethereal password
				}
		});
	}
})

app.use("/libs",express.static(__dirname + '/libs'));
app.use("/clientscripts",express.static(__dirname + '/clientscripts'));

app.listen(PORT, () => console.log('Example app listening on port ' + PORT + '!'));



//////////////////////////////////////INIT SUBMODULES//////////////////////////////////////

const accountsApp = new accounts(app);
const sessionsApp = new sessionManager(app);

if(argv.generateUsers)
{
	accountsApp.generateFakeAccounts(argv.generateUsers);
}

///////////////////////////////////////FRONT PAGES////////////////////////////////////

app.get('/', (req, res) => res.redirect(URL + '/student/'))
app.get('/student', (req, res) => res.render(__dirname + '/templates/student.hbs', {SERVER_URL: URL}))
app.get('/teacher', (req, res) =>
	{

		if (req.session.username != null && req.session.password != null)
		{
				// Already logged in.
				if(req.session.role == "teacher")
				{
					res.render(__dirname + '/templates/teacherMenu.hbs', {SERVER_URL: URL});
				}
				else
				{
					res.render(__dirname + '/templates/adminMenu.hbs', {SERVER_URL: URL});
				}
		}
		else
		{
			res.render(__dirname + '/templates/login.hbs', {SERVER_URL: URL});
		}
	}
)
app.get('/adminusers', (req ,res) => {

	helpers.authenticateUser(req.session, users, true)

	.then((data) =>{

		if(data.valid)
		{
			res.render(__dirname + "/templates/adminUsers.hbs", {SERVER_URL: URL})
		}
		else
		{
			return Promise.reject("Error: Access forbidden");
		}

	})

	.catch((message)=>
	{
		res.status(400).send(message);
	})
})

app.get('/createsession', (req, res) =>
{
	if (req.session.username != null && req.session.password != null)
	{
		res.render(__dirname + '/templates/createSession.hbs', {SERVER_URL: URL});
	}
	else
	{
		res.render(__dirname + '/templates/login.hbs', {SERVER_URL: URL});
	}
})
