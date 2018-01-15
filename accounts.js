const helpers = require('./serverHelpers.js');
const monk = require('monk');
const db = monk("localhost:27017/registermate");
const users = db.get('users');

// My module
function Accounts(app)
{

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
					req.session.password = req.body.password1;
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
						req.session.role = data.role;
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
	app.get('/logout', (req, res) =>
	{
		req.session = null;
		res.redirect('/teacher');
	})

	/////////////////////////////////////// RESET STUFF //////////////////////////////////////

	app.get('/requestreset', (req, res) =>{
		res.render(__dirname + '/templates/requestReset.hbs');
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
				{ username: doc.username, site_url: "localhost:3000", token: token },
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
		res.render(__dirname + '/templates/resetPassword.hbs');

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
}

module.exports = Accounts;
