const express = require('express');
const app = express();
const monk = require('monk');
const helpers = require('./serverHelpers.js')
const db = monk("localhost:27017/registermate");
const bodyParser = require("body-parser");
const cookieSession = require('cookie-session');
const hbs = require('hbs');

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
			res.sendFile(__dirname + '/clientscripts/login.html');
		}
	}
)

app.get('/registeraccount', (req, res) =>{
	res.render(__dirname + '/templates/registerAccount.hbs');
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

		console.log(ud);

		return users.count()

		// users.findOne({username: req.body.username})
		//
	})

	.then((doc) => {

		console.log(doc);
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
		console.log(doc);

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
	var m = req.session.role;
	req.session = null;
	res.redirect('/teacher');
})


app.listen(3000, () => console.log('Example app listening on port 3000!'))
