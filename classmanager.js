const helpers = require('./serverHelpers.js');
const monk = require('monk');
const db = monk("localhost:27017/registermate");
const users = db.get('users');
const classes = db.get('classes');
const departmentData = db.get('departmentData')
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
			console.log(data);
			res.send(data);
		})

		.catch((err)=>{
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
			console.log(doc);
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


}

module.exports = ClassManager;
