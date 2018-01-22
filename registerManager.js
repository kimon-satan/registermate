const helpers = require('./serverHelpers.js');
const monk = require('monk');
const db = monk("localhost:27017/registermate");
const ObjectId = require('mongodb').ObjectID;
const users = db.get('users');
const classes = db.get('classes');
const departmentData = db.get('departmentData');
const students = db.get('students');
const registers = db.get('registers');


//Classes DB
/*
{
department: ,
modules: [], classname: ,
term: ,
teachers: [], sessionarray: [date, date, blank, blank, blank, etc... ]
}
*/

function RegisterManager(app)
{
	app.get('/takeregister' , (req, res) => {

		if (req.session.username != null && req.session.password != null)
		{
			res.render(__dirname + '/templates/takeRegister.hbs', {SERVER_URL: URL});
		}
		else
		{
			res.render(__dirname + '/templates/login.hbs', {SERVER_URL: URL});
		}

	})

	app.post('/changecurrentsession', (req,res) =>
	{
		var auth = {
			username: req.session.username,
			password: req.session.password
		}

		helpers.authenticateForClass(auth, req.query._id)

		.then(()=>{
			return classes.update(req.body.class, {$set: {currentsession: req.body.currentsession}});
		})

		.then(()=>{
			return classes.findOne(req.body.class);
		})

		.then((doc)=>{
			res.send(doc);
		})

		.catch((err)=>{
			res.status(400).send(err);
		})

	});

	app.post('/openregister', (req,res) =>
	{
		var auth = {
			username: req.session.username,
			password: req.session.password
		}

		helpers.authenticateForClass(auth, req.query._id)

		.then((doc)=>{
			return classes.findOne(req.body.class);
		})

		.then((doc)=>{

			doc.sessionarray[doc.currentsession] = Date.now(); //timestamp the register
			return classes.update(req.body.class,
				{$set: {
					classpass: req.body.classpass,
					sessionarray: doc.sessionarray,
					marklate: false
				}});
		})

		.then((doc)=>
		{
			return registers.find({class_id: ObjectId(req.body.class)});
		})

		.then((docs)=>
		{
			//point the students to the correct class
			if(docs.length > 0)
			{
				var p = docs.map((doc)=>{

					//remove any existing sessions
					if(doc.session_id)
					{
						global.sessionstore.destroy(doc.session_id,function(error){
							console.log(error)
						});
					}

					return students.update(doc.student_id, {$set: {currentclass: req.body.class, session_id: null}});
				})

				return Promise.all(p);
			}
			else
			{
				return Promise.reject("I can't find any students for this class.")
			}
		})

		.then((doc)=>{
			return classes.findOne(req.body.class);
		})

		.then((doc)=>{
			res.send(doc);
		})

		.catch((err)=>{
			console.log(err);
			res.status(400).send(err);
		})

	});

	app.post('/closeregister', (req,res) =>
	{
		var auth = {
			username: req.session.username,
			password: req.session.password
		}

		var classDoc;

		helpers.authenticateForClass(auth, req.query._id)

		.then((doc)=>
		{
			//find the class
			return classes.findOne(req.body.class);
		})

		.then((doc)=>
		{
			classDoc = doc;
			return classes.update(req.body.class, {$set: {classpass: null}});
		})

		.then((doc)=>
		{
			return registers.find({class_id: ObjectId(req.body.class)});
		})

		.then((docs)=>
		{
			var p = docs.map((doc)=>{
				//mark student absent if Unregistered
				var i = Number(classDoc.currentsession);
				if(doc.attendance[i] == "U")
				{
					doc.attendance[i] = "A";
					return registers.update(doc._id, {$set: {attendance: doc.attendance}});
				}
			})

			return Promise.all(p);
		})

		.then((doc)=>
		{
			//reset only those students who have this class as their current one
			students.update({currentclass: req.body.class},{$set: {currentclass: null}},{multi: true});
			return students.find({currentclass: req.body.class});
		})

		.then((docs)=>
		{
			//reset only those students who have this class as their current one
			docs.forEach(function(item){
				//destroy session
				if(item.session_id)
				{
					global.sessionstore.destroy(item.session_id,function(error){
						console.log(error)
					});
					students.update(item._id, {$set: {session_id: null}});
				}
			})

		})

		.then((doc)=>
		{
			return classes.findOne(req.body.class);
		})

		.then((doc)=>{
			res.send(doc);
		})

		.catch((err)=>
		{
			console.log(err);
			res.status(400).send(err);
		})

	});

	app.post("/changestudentstatus", (req,res)=>{

		var auth = {
			username: req.session.username,
			password: req.session.password
		}

		var classDoc;

		helpers.authenticateForClass(auth, req.query._id)

		.then((doc) => {
			//find the student
			return students.findOne({username: req.body.username})
		})

		.then((doc) =>{
			//find the register record
			return registers.findOne({student_id: doc._id, class_id: ObjectId(req.body.class)});
		})

		.then((doc) =>{
			doc.attendance[Number(req.body.sessionnum)] = req.body.status;
			return registers.update(doc._id, doc);
		})

		.then(()=>{
			res.end();
		})

	})

	app.post("/setclassparameter", (req,res)=>{

		//just a simple setting of a classdoc parameter

		var auth = {
			username: req.session.username,
			password: req.session.password
		}

		//create a new params object excluding class property
		var k = Object.keys(req.body);
		var params = {};
		for(var i = 0; i < k.length; i++)
		{
			if(k[i] != "class")
			{
				params[k[i]] = req.body[k[i]];
			}
		}

		helpers.authenticateForClass(auth, req.body.class)

		.then((doc)=>
		{
			return classes.update(req.body.class, {$set: params});
		})

		.catch((err)=>
		{
			console.log(err);
			res.status(400).send(err);
		})

	});

	app.get("/absenteeemail", (req,res) =>
	{
		users.findOne({username: req.session.username},{fields: {firstname: 1, email: 1}})

		.then((doc)=>
		{
			teacherDoc = doc;
			//find the class
			return classes.findOne(ObjectId(req.query.class));
		})

		.then((doc)=>
		{

				res.render(__dirname + '/templates/absentMessage.hbs',
				{ username: "Xxxxx",
					sessionnum: Number(doc.currentsession) + 1,
					numsessions: doc.sessionarray.length,
					classname: doc.classname,
					numabsences: "x",
					personaltext: req.query.personaltext,
					teachername: teacherDoc.firstname
				});
		})

		.catch((err)=>
		{
			console.log(err);
			res.status(400).send(err);
		})

	})

	app.post("/emailabsentees", (req,res) =>
	{
		var classDoc;
		var teacherDoc;
		var numEmails = 0;

		var auth = {
			username: req.session.username,
			password: req.session.password
		}

		helpers.authenticateForClass(auth, req.body.class)

		.then((doc)=>
		{
			//find the user
			return users.findOne({username: req.session.username},{fields: {firstname: 1, email: 1}});
		})

		.then((doc)=>
		{
			teacherDoc = doc;
			//find the class
			return classes.findOne(ObjectId(req.body.class));
		})

		.then((doc)=>
		{
			classDoc = doc;

			//find students marked absent for current session
			var qobj = {class_id: ObjectId(req.body.class)};
			qobj["attendance." + classDoc.currentsession] = "A";
			return registers.find(qobj);
		})

		.then((docs)=>
		{

			//compile an email list
			var p = docs.map((doc)=>
			{
				//get num absensces
				var numabsences = 0;
				for(var i = 0; i < doc.attendance.length; i++)
				{
					if(doc.attendance[i] == "A")
					{
						numabsences += 1;
					}
				}

				//get student record
				return students.findOne(doc.student_id)
				.then((doc)=>
				{
					var email = doc.username + "@gold.ac.uk";
					var tp = new Promise(function(resolve, reject)
					{

						res.render(__dirname + '/templates/absentMessage.hbs',
						{ username: doc.firstname,
							sessionnum: Number(classDoc.currentsession) + 1,
							numsessions: classDoc.sessionarray.length,
							classname: classDoc.classname,
							numabsences: numabsences,
							personaltext: req.body.personaltext,
							teachername: teacherDoc.firstname
						}, function(err, html)
						{
								if(err){
									reject(err);
								}
								else
								{
									resolve({html: html, email: email});
								}
						});
					})

					return tp;

				})

				.then((doc)=>
				{


					var mail =
					{
						from: teacherDoc.email, // sender address
						to: doc.email, // list of receivers
						subject: 'missed session', // Subject line
						html: doc.html // html body
					};

					if(app.transporter)
					{
						numEmails += 1;
						// send mail with defined transport object
						app.transporter.sendMail(mail, (error, info) =>
						{
							if(error)
							{
								console.log(error);
							}
							else
							{
								console.log(info);
								console.log(mail);
							}

						});

						//we don't wait for the mails to be sent before reporting back
						return Promise.resolve();
					}
					else
					{
						return Promise.reject("Nodemailer was not initialised. Here's what you would have sent..." + mail);
					}

				});

			});

			return Promise.all(p);

		})

		.then(()=>
		{
			res.send(numEmails + " emails have been sent to absentees of this session.");
		})

		.catch((err)=>
		{
			console.log(err);
			res.status(400).send(err);
		})

	});



	//////////////////////////////STUDENT METHODS/////////////////////////

	app.get("/findmyclass", (req,res) =>
	{

		if(req.session.studentname != undefined)
		{
			res.status(400).send("Hey " + req.session.studentname + ",\nYou've already logged in once from this device.");
			return;
		}

		students.findOne({username: req.query.username})

		.then((doc)=>{
			if(doc == null)
			{
				return Promise.reject("I can't find a student with that login");
			}
			else if(doc.currentclass == null)
			{
				return Promise.reject("You currently aren't required to register for any classes");
			}
			else
			{
				return classes.findOne(doc.currentclass)
			}

		})

		.then((doc)=>
		{
			res.render(__dirname + '/templates/passwordRegister.hbs',
			{SERVER_URL: URL, username: req.query.username, classid: doc._id, classname: doc.classname});
		})

		.catch((err)=>
		{
			console.log(err);
			res.status(400).send(err);
		})

	})


	app.get("/passwordregister/:username/:classid", (req,res) =>
	{

		if(req.session.studentname == undefined)
		{
			var username = req.params.username;
			var classid = req.params.classid;

			classes.findOne(classid)

			.then((doc)=>{
				res.render(__dirname + '/templates/passwordRegister.hbs',
				{SERVER_URL: URL, username: username, classid: classid, classname: doc.classname});
			})
		}
		else
		{
			res.render(__dirname + '/templates/success.hbs',
			{SERVER_URL: URL, username: req.session.studentname, isLate: req.session.islate});
		}

	})

	app.post("/registerme", (req,res) =>
	{

		var student_id;
		var classDoc;
		var isLate = false;

		if(req.session.studentname != undefined)
		{
			res.status(400).send("You've already registered");
			return;
		}

		students.findOne({username: req.body.username})

		.then((doc)=>{
			student_id = doc._id;
			return classes.findOne(ObjectId(req.body.classid));
		})


		.then((doc)=>{

			classDoc = doc;

			if(doc == null)
			{
				return Promise.reject("I can't find this class.");
			}
			else if(doc.classpass == null)
			{
				return Promise.reject("The register for this class is now closed");
			}
			else if(doc.classpass != req.body.classpass)
			{
				return Promise.reject("The password is incorrect");
			}
			else
			{
				return registers.findOne({student_id: ObjectId(student_id), class_id: ObjectId(doc._id)});
			}
		})

		.then((doc)=>
		{
			//TODO ... check for dual IP

			var lt = Number(classDoc.latetime) * 1000 * 60; //minutes to milliseconds
			var n = Number(classDoc.currentsession);
			isLate = false;

			if(doc.attendance[n] == "X" || doc.attendance[n] == "L")
			{
				return Promise.reject("You're already registered for this session");
			}
			else if(classDoc.marklate == "true")
			{
				doc.attendance[n] = "L";
				isLate = true;
			}
			else if(lt > 0)
			{
				var s = Number(classDoc.sessionarray[n]);
				if(Date.now() > s + lt)
				{
					doc.attendance[n] = "L";
					isLate = true;
				}
				else
				{
					doc.attendance[n] = "X";
				}
			}
			else
			{
				doc.attendance[n] = "X";
			}

			return registers.update(ObjectId(doc._id), doc);

		})

		.then((doc)=>
		{
			students.update(ObjectId(student_id), {$set: {session_id: req.session.id}});
			req.session.studentname = req.body.username;
			req.session.islate = isLate;
			req.session.cookie.maxAge = 60000 * 40; // 40 mins before next login
			res.render(__dirname + '/templates/success.hbs',
			{SERVER_URL: URL, username: req.session.studentname, isLate: req.session.islate});
		})

		.catch((err)=>
		{
			if(err)
			{
				console.log(err);
				res.status(400).send(err);
			}
			else{
				res.status(400).send("There was a problem on the server ... ");
			}
		})

	})



}




module.exports = RegisterManager;
