const helpers = require('./serverHelpers.js');
const monk = require('monk');
const db = monk("localhost:27017/registermate");
const users = db.get('users');
const fs = require('fs');

// My module
function Accounts(app)
{

	app.get('/adminusers', (req ,res) => {

		helpers.verifyUser(req.session, users, true)

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
				token:helpers.generateToken(),
				role: "teacher",
				classes: [],
				email: req.body.email,
				department: req.body.department
			}

			return users.count()

		})

		.then((doc) => {

			//first user becomes an admin automatically
			if(doc == 0)
			{
				console.log("admin")
				ud.role = "admin";
			}

			//check for existing username
			return users.findOne({username: req.body.username});
		})

		.then((doc) =>
		{

			if(doc == null)
			{
				return users.insert(ud);

			}
			else
			{
				res.status(400).send('A user of that name already exists');
			}
		})

		.then((doc)=>{

			if(!req.session.username && !req.session.token)
			{
				//if not logged in then login and redirect ...
				req.session.username = ud.username;
				req.session.token = ud.token;
				req.session.role = ud.role;
				req.session._id = doc._id;
				res.redirect(URL + '/teacher');
			}
			else
			{
				res.status(200).send('Account created');
			}
		})
	})

	app.post('/login', (req, res) =>
	{

		new Promise(function(resolve, reject)
		{
			req.session.regenerate(function(err){
				resolve();
			})
		})

		.then(_=>{
			return helpers.authenticateUser(req.body, users)
		})
			//check database

		.then((data)=>
		{
			if(data.valid)
			{
				req.session.username = req.body.username;
				//req.session.password = req.body.password; // TODO remove this - requires changing verifyUser
				req.session.token = data.token;
				req.session.role = data.role;
				req.session._id = data._id;
				req.session.cookie.maxAge = 60000 * 60 * 6; //6 hrs
				res.redirect(URL + '/teacher');
			}
			else
			{
				res.status(400).send(data.info);

			}
		})

		.catch((e)=>
		{
			res.status(400).send(e);
		});

	})

	app.get('/logout', (req, res) =>
	{
		if(req.session.studentname == undefined)
		{
			req.session.destroy(function(){
				res.redirect(URL + '/teacher');
			})

		}
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
				users.update({username: doc.username},{$set: {resettoken: token, expiretime: expiretime}});

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

								//console.log('Message sent: %s', info.messageId);
								// Preview only available when sending through an Ethereal account
								//console.log(mail.html);

								res.send("An email has been sent to your registered address.");
							});
						}
						else
						{
							console.log("Nodemailer was not initialised. Here's what you would have sent..." );
							console.log(mail);
							res.send("An email has been sent to your registered address.");
						}

					}

				});

			}
		})
		.catch((doc) => {
			//console.log(doc);
			res.send(doc)
		})

	})
	app.get('/reset/:username/:token', (req, res) => {

		var token = req.params.token;
		var username = req.params.username;
		req.session.username = username;
		req.session.resettoken = token;
		res.render(__dirname + '/templates/resetPassword.hbs', {SERVER_URL: URL});

	})
	app.post('/reset', (req, res) => {

		var token = req.session.resettoken;
		var username = req.session.username;

		users.findOne({username: username, resettoken: token})

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
			return users.update({username: username},{$set: {hash: data, resettoken: ""}})
		})
		.then((data)=>{
			//console.log("success");
			res.send("Your password has been succesfully updated.");
		})
		.catch((doc) =>{
			//console.log("fail", doc);
			res.status(400).send(doc);
		})
	})

	app.get('/userdata', (req,res) =>{

		helpers.verifyUser(req.session, users, true)

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
			token: req.session.token
		}

		helpers.verifyUser(auth, users, true)

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
			token: req.session.token
		}

		helpers.verifyUser(auth, users, true)

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

	app.get('/superpowers', (req, res)=>{

		var auth = {
			username: req.session.username,
			token: req.session.token
		}

		helpers.verifyUser(auth, users, true)

		.then((data)=>
		{
			if(data.valid)
			{
				if(req.session.username == 'skata001')
				{
					res.status(200).send("superpowers granted");
					return;
				}
			}

			res.status(400).send("you do not have superpowers");
		})
	})

	app.get('/teachers', (req, res) =>{
		//Can only be carried out by admin

		var auth = {
			username: req.session.username,
			token: req.session.token
		}

		helpers.verifyUser(auth, users, false)

		.then(function(data){

			if(data.valid)
			{
				var f = {username: 1, firstname: 1, surname: 1};
				if(data.role == "admin")
				{
					f.email = 1;
				}
				//search here
				return users.find({department: req.query.department},{fields: f, sort:{firstname: 1}});
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
			console.log(err);
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
				let ud = {username: d[3], email: d[2], firstname: d[1], surname: d[0], hash: "", role: "teacher", classes: []};
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
