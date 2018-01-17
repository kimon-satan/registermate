const helpers = require('./serverHelpers.js');
const monk = require('monk');
const db = monk("localhost:27017/registermate");
const users = db.get('users');
const fs = require('fs');

// My module
function Accounts(app)
{

	app.get('/registeraccount', (req, res) =>{
		res.render(__dirname + '/templates/registerAccount.hbs', {SERVER_URL: URL});
	})
	app.post('/createaccount', (req, res) =>
	{

		var ud;
		helpers.saltAndHash(req.body.password1)

		.then(function(data)
		{
			ud = {
				username: req.body.username,
				firstname: req.body.firstname,
				surname:req.body.surname,
				hash: data,
				role: "teacher",
				sessions: [],
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
					req.session.password = req.body.password1;
					req.session.role = ud.role;
					res.redirect(URL + '/teacher');
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

	app.post('/login', (req, res) =>
		{
			if(req.session.username != null && req.session.password != null)
			{
				res.redirect(URL + "/teacher")
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
						req.session.role = data.role;
						res.redirect(URL + '/teacher');
					}
					else
					{
						res.status(400).send(data.info);
					}
				})
			}
		}
	)
	app.get('/logout', (req, res) =>
	{
		req.session = null;
		res.redirect(URL + '/teacher');
	})

	/////////////////////////////////////// RESET STUFF //////////////////////////////////////

	app.get('/requestreset', (req, res) =>{
		res.render(__dirname + '/templates/requestReset.hbs', {SERVER_URL: URL});
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
				//generate the token and store it in the DB for the user
				var token = helpers.generateToken();
				var d = new Date();
				var expiretime = d.getTime() + 1000 * 60 * 30; //30 minutes from now
				users.update({username: doc.username},{$set: {token: token, expiretime: expiretime}});

				res.render(__dirname + '/templates/resetMessage.hbs',
				{ username: doc.username, site_url: URL, token: token },
				function(err, html)
				{

					if(err)
					{
						console.error(err);
					}
					else
					{
						var mail =
						{
							from: '"noreply" <noreply@registermate.doc.gold.ac.uk>', // sender address
							to: doc.email, // list of receivers
							subject: 'Registermate', // Subject line
							text: 'password reset', // plain text body
							html: html // html body
						};

						if(app.transporter)
						{
							// send mail with defined transport object
							app.transporter.sendMail(mail, (error, info) =>
							{
								if (error)
								{
									console.error(error);
								}

								console.log('Message sent: %s', info.messageId);
								// Preview only available when sending through an Ethereal account
								console.log(mail.html);

								res.send("An email has been sent to your registered address.");
							});
						}
						else
						{
							console.error("Nodemailer was not initialised. Here's what you would have sent..." + mail);
						}

					}

				});

			}
		})
		.catch((doc) => {
			console.log(doc);
			res.send(doc)
		})

	})
	app.get('/reset/:username/:token', (req, res) => {

		var token = req.params.token;
		var username = req.params.username;
		req.session.username = username;
		req.session.token = token;
		res.render(__dirname + '/templates/resetPassword.hbs', {SERVER_URL: URL});

	})
	app.post('/reset', (req, res) => {

		var token = req.session.token;
		var username = req.session.username;

		users.findOne({username: username, token: token})

		.then((doc) =>
		{
			if(doc == null)
			{
				return Promise.reject("Invalid token");
			}
			else
			{
				var d = new Date();
				var ctime = d.getTime();
				if(ctime > doc.expiretime)
				{
					return Promise.reject("Reset token has expired");
				}
				else
				{
					return helpers.saltAndHash(req.body.password1)
				}
			}
		})
		.then((data)=>{
			//update the password and destroy the token
			req.session = null;
			return users.update({username: username},{$set: {hash: data, token: ""}})
		})
		.then((data)=>{
			console.log("success");
			res.send("Your password has been succesfully updated.");
		})
		.catch((doc) =>{
			console.log("fail", doc);
			res.status(400).send(doc);
		})
	})

	app.get('/userdata', (req,res) =>{

		helpers.authenticateUser(req.session, users, true)

		.then((data) =>{

			if(data.valid)
			{

				var idx = (req.query.idx != undefined) ? Number(req.query.idx) : 0;
				var items = (req.query.items != undefined) ? Number(req.query.items) : 50;
				var query = {};
				if(req.query.username != undefined)query.username = req.query.username;
				if(req.query._id != undefined)query._id = req.query._id;
				if(req.query.firstname != undefined)query.firstname = req.query.firstname;
				if(req.query.surname != undefined)query.surname = req.query.surname;
				if(req.query.email != undefined)query.email = req.query.email;

				return users.find(
					query,
					{fields: {username: 1, email: 1, role: 1, firstname: 1, surname: 1},
					sort: {username: 1},
					skip: idx, limit: items});
			}
			else
			{
				return Promise.reject("Error: Access forbidden");
			}

		})

		.then((docs)=>{

			res.json(docs);

		})


		.catch((message)=>
		{
			res.status(400).send(message);
		})
	})

	app.post('/changerole', (req, res) =>{

		//Can only be carried out by admin

		var auth = {
			username: req.session.username,
			password: req.session.password
		}

		helpers.authenticateUser(auth, users, true)

		.then(function(data){

			if(data.valid)
			{
				//change user role here
				return users.findOne(req.body, {role: 1});
			}
			else
			{
				return Promise.reject(data.info);
			}
		})

		.then((data)=>{

			if(data == null)
			{
				return Promise.reject("Record not found");
			}
			else
			{
				data.role = (data.role == "admin")? "teacher" : "admin";
				return users.update(data._id, {$set: {role: data.role}});
			}

		})

		.then((doc)=>{
			res.send("User updated");
		})

		.catch((err)=>{
			res.status(400).send(err);
		})


	})

	app.post('/removeuser', (req, res) =>{

		//Can only be carried out by admin

		var auth = {
			username: req.session.username,
			password: req.session.password
		}

		helpers.authenticateUser(auth, users, true)

		.then(function(data){

			if(data.valid)
			{
				//change user role here
				return users.findOne(req.body, {});
			}
			else
			{
				return Promise.reject(data.info);
			}
		})

		.then((data)=>{

			if(data == null)
			{
				return Promise.reject("Record not found");
			}
			else
			{
				return users.remove(data._id);
			}

		})

		.then((doc)=>{
			res.send("User removed");
		})

		.catch((err)=>{
			res.status(400).send(err);
		})

	})

	app.get('/instructors', (req, res) =>{
		//Can only be carried out by admin

		var auth = {
			username: req.session.username,
			password: req.session.password
		}

		helpers.authenticateUser(auth, users, true)

		.then(function(data){

			if(data.valid)
			{
				//search here
				return users.find({department: req.query.department},{fields: {username: 1, firstname: 1, surname: 1, email: 1}, sort:{firstname: 1}});
			}
			else
			{
				return Promise.reject(data.info);
			}
		})

		.then((doc)=>{
			res.send(doc);
		})

		.catch((err)=>{
			res.status(400).send(err);
		})

	});
}

Accounts.prototype.generateFakeAccounts = function(numUsers)
{
	//generates fake users to bring the number to the required total
	var numNew = 0;
	var numOld = 0;
	users.count()

	.then((doc)=>{

		numOld = doc;
		numNew = numUsers - numOld;
		if(numNew < 0)
		{
			return Promise.reject();
		}else{
			return new Promise(function(resolve, reject)
			{
				fs.readFile(__dirname + "/dummyStaff.csv", 'utf8', function(err,data)
				{
					resolve(data);
				})
			})
		}

	})


	.then((data)=>{

		var temp = data.split("\r");
		if(numOld + numNew > temp.length)
		{
			return Promise.reject();
		}
		else
		{

			var parsed = [];
			for(var i = numOld; i < numOld + numNew; i++)
			{
				let d = temp[i].split(",");
				let ud = {username: d[3], email: d[2], firstname: d[1], surname: d[0], hash: "", role: "teacher", sessions: []};
				ud.department = (Math.random() > 0.5)? "Computing" : "Art";
				parsed.push(ud);
			}
			users.insert(parsed);
		}
	})

	.catch((doc)=>{

	})

}

module.exports = Accounts;
