const helpers = require('./serverHelpers.js');
const monk = require('monk');
const db = monk("localhost:27017/registermate");
const ObjectId = require('mongodb').ObjectID;
const users = db.get('users');
const classes = db.get('classes');
const departmentData = db.get('departmentData');
const students = db.get('students');
const registers = db.get('registers');
const fs = require('fs');
var departmentList = [];


//Classs DB
/*
{
department: ,
modules: [], classname: ,
term: ,
students: [],
teachers: [], classarray: [date, date, blank, blank, blank, etc... ]
}
*/

function ClassManager(app)
{
	//LOAD THE HARDCODED DEPARTMENT DATA
	fs.readFile(__dirname + "/config/departmentinfo.json",
	function(err, data)
	{
		var d = JSON.parse(data);
		departmentList = Object.keys(d);
		departmentList.sort();

		//iterate through departments
		Object.keys(d).forEach(function(item)
		{
			d[item].modules.forEach(function(module)
			{
				departmentData.findOne({department: item, code: module.code, title: module.title})
				.then((doc)=>{
					if(doc == null)
					{
						//insert modules if necessary
						departmentData.insert({department: item, code: module.code, title: module.title});
					}
				})
			});

		});
	})

	///////////////////////////////////////////////////////

	setInterval(function(){

		//find classes which are currently open

		classes.find({classpass: {$ne: null}})

		.then((doc)=>
		{
			doc.forEach(function(classdoc){
				var t = classdoc.sessionarray[Number(classdoc.currentsession)];
				var d = Date.now();
				var diff = d - t;
				if(diff > 60 * 60 * 1000) //close any class after 1 hour
				{
					//close the class
					classes.update(classdoc._id, {$set: {classpass: null}})

					.then((doc)=>
					{
						return registers.find({class_id: classdoc._id});
					})

					.then((docs)=>
					{
						var p = docs.map((doc)=>{
							//mark student absent if Unregistered
							var i = Number(classdoc.currentsession);
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
						return students.find({currentclass: String(classdoc._id)});
					})

					.then((docs)=>
					{

						docs.forEach(function(item){
							//destroy session
							if(item.session_id)
							{
								global.sessionstore.destroy(item.session_id,function(error){
									//console.log(error)
								});
								students.update(item._id, {$set: {session_id: null, currentclass: null}});
							}
						})

					})
				}

			})
		})

	},1000);

	/////////////////////////////////////////////////////////

	app.get('/adminclasses', (req ,res) => {

		helpers.authenticateUser(req.session, users, true)

		.then((data) =>{

			if(data.valid)
			{
				res.render(__dirname + "/templates/adminClasses.hbs", {SERVER_URL: URL})
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

	app.get('/departmentlist', (req,res) =>
	{
		//get the list of departments
		res.send(departmentList);
	});

	app.get('/modulelist', (req,res) =>
	{
		//get a list of modules for a department
		departmentData.find(req.query,{sort: {code: 1}, fields: {title: 1, code: 1}})
		.then((doc) => {
			res.send(doc);
		})

	});

	app.get('/userclasses', (req,res) =>
	{
		//get a list of classes for a user
		classes.find({"teachers.username": req.session.username},
			{sort: {classname: 1},fields: {classname: 1}})
		.then((doc)=>{
			res.send(doc);
		})
	})

	app.get('/classdoc', (req,res) =>
	{
		//get a class document
		var auth = {
			username: req.session.username,
			password: req.session.password
		}

		var role;

		helpers.authenticateForClass(auth, req.query._id)

		.then((data) =>{
			return classes.findOne(req.query._id);
		})

		.then((data) =>{
			res.send(data);
		})

		.catch((err)=>{
			console.log(err);
			res.status(400).send(err);
		})
	})

	app.post('/createclass', (req,res) =>{

		var auth =
		{
			username: req.session.username,
			password: req.session.password
		};

		var teacherDoc;

		helpers.authenticateUser(auth, users, false)

		.then((data)=>{

			if(data.valid)
			{
				//get the teacher
				return users.findOne(data._id,{fields: {username: 1, firstname: 1, surname: 1}});
			}
			else
			{
				return Promise.reject(data.info);
			}
		})

		.then((doc)=>
		{
			teacherDoc = doc;
			return classes.findOne({classname: req.body.classname});
		})

		.then((doc)=>
		{

			if(doc == null)
			{
				//okay we can make the class
				var s = req.body;
				s.sessionarray = [];
				s.classpass = null;
				s.currentsession = 0;
				s.marklate = false;
				s.latetime = 0;
				//default to 10 sessions
				for(var i = 0; i < 10; i++)
				{
					s.sessionarray.push("U");
				}
				s.teachers = [teacherDoc];

				return classes.insert(s);
				//add the class to the teacher
			}
			else
			{
				return Promise.reject("Error: class already exists");
			}
		})

		.then((doc)=>{
			//add the class id to the teacher
			users.update({username: req.session.username},{$addToSet: {classes: doc._id}});
			res.send("new class created");
		})

		.catch((err)=>{
			res.status(400).send(err);
		})

	})

	app.post('/removefromclasses', (req,res) =>
	{
		//removes a user from all classes
		//we actually need to do this before removing users
		var auth = {
			username: req.session.username,
			password: req.session.password
		}

		helpers.authenticateUser(auth, users, false)

		.then(function(data){

			if(data.valid)
			{
				//get the teacherDoc
				return users.findOne(req.body._id,{fields: {username: 1, firstname: 1, surname: 1}});
			}
			else
			{
				return Promise.reject(data.info);
			}
		})

		.then((doc)=>{
			return classes.update({},{$pull: {"teachers": doc}},{multi: true});
		})

		.then((doc)=>
		{
			return users.update({username: req.body.username},{$set: {classes: []}});
		})

		.then((doc)=>{
			res.send("user purged");
		})

		.catch((doc)=>{
			res.status(400).send(doc);
		})

	})

	app.post('/addteacher', (req,res) =>
	{
		//add an teacher to a class
		//get a class document
		var auth = {
			username: req.session.username,
			password: req.session.password
		}

		helpers.authenticateForClass(auth, req.body.class)

		.then((data)=>{
			//find the teacher
			return users.findOne(req.body.teacher,{fields: {username: 1, firstname: 1, surname: 1}});
		})

		.then((data)=>
		{
			if(data == null)
			{
				//couldn't find the teacher
				return Promise.reject("Teacher not found");
			}
			else
			{
				//add the teacher and send the class doc
				users.update(data._id,{$addToSet: {classes: req.body.class}});
				return classes.update(req.body.class, {$addToSet: {teachers: data}});
			}
		})

		.then((data) =>{
			return classes.findOne(req.body.class);
		})

		.then((data) =>{
			res.send(data);
		})

		.catch((err)=>{
			console.log(err);
			res.status(400).send(err);
		})
	})

	app.post('/removeteacher', (req,res) =>
	{

		//add an teacher to a class
		//get a class document
		var auth = {
			username: req.session.username,
			password: req.session.password
		}

		helpers.authenticateForClass(auth, req.query._id)

		.then((data)=>{
			//find the teacher
			return users.findOne(req.body.teacher,{fields: {username: 1, firstname: 1, surname: 1}});
		})

		.then((data)=>
		{
			if(data == null)
			{
				//couldn't find the teacher
				return Promise.reject("Teacher not found");
			}
			else
			{
				//remove the teacher
				users.update(data._id,{$pull: {classes: req.body.class}});
				return classes.update(req.body.class, {$pull: {teachers: data}});
			}
		})

		.then((data) =>
		{
			//get the updated class
			return classes.findOne(req.body.class);
		})

		.then((data) =>
		{
			res.send(data);
		})

		.catch((err)=>{
			res.status(400).send(err);
		})
	})

	app.post('/addstudents', (req,res) =>
	{

		//adds students to a class
		//1. get class

		var classDoc = {};
		var studentQueries = [];
		var createdStudents = 0;
		var addStudents = 0;
		var existingStudents = 0;

		var auth = {
			username: req.session.username,
			password: req.session.password
		}

		helpers.authenticateForClass(auth, req.body.class)

		.then((doc)=>
		{
			//1. get class
			return classes.findOne(req.body.class)

		})

		.then((doc)=>
		{

			if(doc == null)
			{
				return Promise.reject("This class doesn't exist.");
			}
			else
			{
				//2. check if the student exists - if not create, check for name discrepency
				classDoc = doc;
				var attendanceArray = [];
				for(var i = 0; i < classDoc.sessionarray.length; i++)
				{
					attendanceArray.push("U");
				}

				var p = req.body.students.map((student)=>
				{
					var regObject = {};
					return students.findOne({username: student.username})
					.then((doc)=>{

						if(doc == null)
						{
							createdStudents += 1;
							student.departments = [classDoc.department];
							student.currentclass = "";
							return students.insert(student);
						}
						else
						{
							//check details match ... if not save a query for later ... don't insert the student
							if(student.firstname != doc.firstname ||
								student.surname != doc.surname)
							{
								studentQueries.push(student);
							}

							if(! doc.departments.includes(classDoc.department))
							{
								return students.update(doc._id, {$addToSet: {departments: classDoc.department}});
							}
							else{
								return Promise.resolve(doc);
							}
						}


					})
					.then((doc)=>
					{
						//check that a regObject has not already been inserted
						regObject = {student_id: doc._id, class_id: classDoc._id, attendance: attendanceArray};
						return registers.findOne({student_id: doc._id, class_id: classDoc._id});

					})
					.then((doc)=>
					{
						if(doc == null)
						{
							addStudents += 1;
							registers.insert(regObject)
						}
						else{
							existingStudents += 1;
						}

					})
				})

				return Promise.all(p)

			}

		})

		.then((doc)=>{

			if(studentQueries.length == 0)
			{
				var str = "";
				if(existingStudents > 0)
				{
					str += existingStudents  + " students were already in the class.\n";
				}
				str += addStudents  + " students have been added to the class.\n";
				if(createdStudents > 0)
				{
					str += createdStudents + " of them are new to registermate."
				}
				res.send(str);
			}
			else {
				res.send(studentQueries)
			}

		})



	});

	app.post('/removestudentfromclass', (req,res) =>
	{
		var auth = {
			username: req.session.username,
			password: req.session.password
		}

		var studentList = [];

		helpers.authenticateForClass(auth, req.body.class)

		.then((doc)=>
		{
			return registers.remove({class_id: ObjectId(req.body.class), student_id: ObjectId(req.body.student)});
		})

		.then((doc)=>
		{
			res.send("student removed from class");
		})

		.catch((err)=>{
			res.status(400).send(err);
		})

	})

	app.post('/removeclass', (req,res) =>
	{
		var auth = {
			username: req.session.username,
			password: req.session.password
		}

		var studentList = [];

		helpers.authenticateForClass(auth, req.body.class)

		.then((doc)=>
		{
			//remove any registers
			registers.remove({class_id: ObjectId(req.body.class)});
			//remove the class from any teachers who have it
			users.update({},{$pull: {classes: req.body.class}},{multi: true});
			//remove the class itself
			return classes.remove(req.body.class);
		})

		.then((doc)=>
		{
			res.send("class removed");
		})

		.catch((err)=>{
			res.status(400).send(err);
		})

	})

	app.get('/classstudents', (req,res) =>
	{
		var auth = {
			username: req.session.username,
			password: req.session.password
		}

		var studentList = [];

		helpers.authenticateForClass(auth, req.query._id)

		.then((doc)=>
		{
			return registers.find({class_id: ObjectId(req.query._id)});
		})

		.then((doc)=>{

			//create a student list
			var p = doc.map((register)=>{
				return students.findOne(register.student_id,
					{fields: {username: 1, firstname: 1, surname: 1}})
					.then((doc)=>{
						doc.attendance = register.attendance;
						return Promise.resolve(doc);
					})
			})

			return Promise.all(p);

		})

		.then((doc)=>{
			//sort the results by surname
			doc.sort(function(a,b){
				return (a.surname < b.surname)? -1 : 1;
			})
			res.send(doc);
		})

		.catch((err)=>{
			res.status(400).send(err);
		})

	})

	app.post('/changenumsessions', (req,res) =>
	{
		var auth = {
			username: req.session.username,
			password: req.session.password
		}

		var studentList = [];
		var diff;
		var idx;
		var classDoc;

		helpers.authenticateForClass(auth, req.body.class)
		.then((doc)=>
		{
			//get the classDoc
			return classes.findOne(req.body.class);
		})

		.then((doc)=>
		{
			classDoc = doc;
			diff = req.body.num - doc.sessionarray.length;
			idx = doc.sessionarray.length + diff;

			if(diff < 0)
			{
				doc.sessionarray.splice(idx, Math.abs(diff));
			}
			else
			{
				for(var i = 0; i < diff; i++)
				{
					doc.sessionarray.push("U");
				}

			}

			classes.update(doc._id, doc);
			return registers.find({class_id: ObjectId(doc._id)});
		})

		.then((docs)=>{
			//update each student record in the same way
			var p = docs.map((doc)=>{
				if(diff < 0)
				{
					doc.attendance.splice(idx, Math.abs(diff));
				}
				else
				{
					for(var i = 0; i < diff; i++)
					{
						doc.attendance.push("U");
					}
				}
				return registers.update(doc._id, doc);
			});

			return Promise.all(p);

		})

		.then(()=>
		{
			//send back the modified class
			res.send(classDoc);
		})

		.catch((err)=>{
			res.status(400).send(err);
		})

	})

	app.get('/classdata', (req,res) =>
	{

		helpers.authenticateUser(req.session, users, true)

		.then((data) =>{

			if(data.valid)
			{

				var idx = (req.query.idx != undefined) ? Number(req.query.idx) : 0;
				var items = (req.query.items != undefined) ? Number(req.query.items) : 50;
				var query = {};
				if(req.query.module != undefined)query.module = req.query.module; //TODO account for duel
				if(req.query._id != undefined)query._id = req.query._id;
				//if(req.query.departments != undefined)query.departments = req.query.departments; //TODO

				return classes.find(
					query,
					{fields: {classname: 1, module: 1, modules: 1, teachers: 1, sessionarray: 1},
					sort: {classname: 1},
					skip: idx, limit: items}
				);
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

}

module.exports = ClassManager;
