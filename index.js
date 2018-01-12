const express = require('express');
const app = express();
const monk = require('monk');
const helpers = require('./serverHelpers.js')
const db = monk("localhost:27017/registermate");
const bodyParser = require("body-parser");
const cookieSession = require('cookie-session');

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

app.use("/libs",express.static(__dirname + '/libs'));
app.use("/html",express.static(__dirname + '/html'));

app.get('/', (req, res) => res.sendFile(__dirname + '/html/student.html'))
app.get('/student', (req, res) => res.sendFile(__dirname + '/html/student.html'))
app.get('/teacher', (req, res) =>
	{
		if (req.session.username & req.session.password != null) {
				// Already logged in.
				res.sendFile(__dirname + '/html/teacher-front.html')
		 } else {
				res.sendFile(__dirname + '/html/login.html')
		 }
	}
)
app.get('/admin' , (req, res) =>
	{
		if (req.session.username != null && req.session.password != null) {
				// Already logged in.
				res.sendFile(__dirname + '/html/admin-front.html')
		 } else {
				res.sendFile(__dirname + '/html/login.html')
		 }
	}
)

app.get('/initadmin', (req, res) =>{
	{
		users.findOne({})
		.then(
			(doc) =>
			{
				if(doc == null)
				{
					res.sendFile(__dirname + '/html/initadmin.html')
				}
				else
				{
					res.status(400).send('Admin already exists');
				}
			}
		)
	}
})

app.post('/createadmin', (req, res) =>
{

	helpers.saltAndHash(req.body.password1)

	.then(function(data)
	{

		var ud = {
			username: req.body.username,
			hash: data,
			role: "admin",
			email: req.body.email
		};

		var auth = {
			username: req.session.username,
			password: req.session.password
		}

		helpers.authenticateUser(auth, users)

		.then(function(data){

			if(data.valid)
			{
				users.findOne({username: req.body.username})
				.then(
					(doc) =>
					{
						if(doc == null)
						{
							users.insert(ud)
							res.status(200).send('Admin created');
						}
						else
						{
							res.status(400).send('Admin already exists');
						}
					}
				)
			}
			else
			{
				res.status(400).send('Authentication failed');
			}
		})

	})

})

app.post('/login', (req, res) =>
	{
		if(req.session.username & req.session.password != null)
		{
			//logged in
			res.redirect('/html/teacher-front.html');
		}
		else
		{
			//check database
			helpers.authenticateUser(req.body, users)

			.then((data)=>{
				if(data.valid)
				{
					req.session.username = req.body.username;
					req.session.password = req.body.password;
					res.type('.html');
					res.redirect('/html/teacher-front.html');
				}
				else
				{
					res.status(400).send('Username or password is incorrect');
				}
			})
		}
	}
)

app.get('/logout', (req, res) => {
	req.session = null;
	res.redirect('/html/login.html');
})



app.listen(3000, () => console.log('Example app listening on port 3000!'))
