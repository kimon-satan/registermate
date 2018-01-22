const express = require('express');
const app = express();
const monk = require('monk');
const helpers = require('./serverHelpers.js')
const db = monk("localhost:27017/registermate");
const bodyParser = require("body-parser");
const expressSession = require('express-session');
const mdbstore = require('connect-mongodb-session')(expressSession);
const hbs = require('hbs');
const nodemailer = require('nodemailer');
const accounts = require('./accounts.js');
const classManager = require('./classmanager.js');
const registerManager = require('./registermanager.js');
const argv = require('yargs').argv;

const PORT = 8000;
global.URL = "http://doc.gold.ac.uk/usr/215"
//global.URL = "";

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

global.sessionstore = new mdbstore(
{
	uri: 'mongodb://localhost:27017/connect_mongodb_session_test',
	collection: 'mySessions'
});

// Catch errors
global.sessionstore.on('error', function(error) {
	assert.ifError(error);
	assert.ok(false);
});

app.set('trust proxy', 1) // trust first proxy
app.use(expressSession({
	secret: 'keyboard cat',
	resave: false,
	store: global.sessionstore,
	cookie: { maxAge: 60000 },
	saveUninitialized: false
}));


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
const classApp = new classManager(app);
const registerApp = new registerManager(app);

if(argv.generateUsers)
{
	accountsApp.generateFakeAccounts(argv.generateUsers);
}


///////////////////////////////////////FRONT PAGES////////////////////////////////////

app.get('/', (req, res) => res.redirect(URL + '/student/'))
app.get('/student', (req, res) =>
{
	if(req.session.studentname == null)
	{
		res.render(__dirname + '/templates/student.hbs', {SERVER_URL: URL})
	}
	else
	{
		res.render(__dirname + '/templates/success.hbs',
		{SERVER_URL: URL, username: req.session.studentname, isLate: req.session.islate})
	}
})
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

app.get('/createclass', (req, res) =>
{
	if (req.session.username != null && req.session.password != null)
	{
		res.render(__dirname + '/templates/createClass.hbs', {SERVER_URL: URL});
	}
	else
	{
		res.render(__dirname + '/templates/login.hbs', {SERVER_URL: URL});
	}
})

app.get('/editclass' , (req, res) => {

	if (req.session.username != null && req.session.password != null)
	{
		res.render(__dirname + '/templates/editClass.hbs', {SERVER_URL: URL});
	}
	else
	{
		res.render(__dirname + '/templates/login.hbs', {SERVER_URL: URL});
	}

})
