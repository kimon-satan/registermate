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
			return classes.update(req.body.class, {$set: {classpass: req.body.classpass, sessionarray: doc.sessionarray}});
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
					return students.update(doc.student_id, {$set: {currentclass: req.body.class}});
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
			return students.update({currentclass: req.body.class},{$set: {currentclass: null}},{multi: true});
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

	app.get("/findmyclass", (req,res) =>
	{
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

		.then((doc)=>{
			res.send(doc._id);
		})

		.catch((err)=>
		{
			console.log(err);
			res.status(400).send(err);
		})

	})

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
			res.render(__dirname + '/templates/success.hbs', {SERVER_URL: URL});
		}

	})

	app.post("/registerme", (req,res) =>
	{

		var student_id;
		var classDoc;

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
			console.log("registering");
			//TODO ... marking late
			//TODO ... check for dual IP
			doc.attendance[Number(classDoc.currentsession)] = "X";
			return registers.update(ObjectId(doc._id), doc);
		})

		.then((doc)=>
		{
			req.session.studentname = req.body.username;
			req.session.cookie.maxAge = 60000 * 40; // 40 mins before next login
			res.render(__dirname + '/templates/success.hbs',{SERVER_URL: URL});
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
