const helpers = require('./serverHelpers.js');
const monk = require('monk');
const db = monk("localhost:27017/registermate");
const users = db.get('users');
const sessions = db.get('sessions');
const departmentData = db.get('departmentData')
const fs = require('fs');
var departmentList = [];


//Sessions DB
/*
{
department: ,
modules: [],
sessionname: ,
term: ,
students: [],
teachers: [],
sessionarray: [date, date, blank, blank, blank, etc... ]
}
*/

function SessionManager(app)
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

	app.get('/usersessions', (req,res) =>
	{
		//get a list of sessions for a user
		sessions.find({teachers: req.session.username},
			{sort: {sessionname: 1},fields: {sessionname: 1}})
		.then((doc)=>{
			res.send(doc);
		})
	})

	app.get('/sessiondoc', (req,res) =>
	{
		//get a session document
		var auth = {
			username: req.session.username,
			password: req.session.password
		}

		var role;

		helpers.authenticateForSession(auth, req.query._id)

		.then((data) =>{
			return sessions.findOne(req.query._id);
		})

		.then((data) =>{
			console.log(data);
			res.send(data);
		})

		.catch((err)=>{
			res.status(400).send(err);
		})
	})

	app.post('/createsession', (req,res) =>{

		var auth =
		{
			username: req.session.username,
			password: req.session.password
		}

		helpers.authenticateUser(auth, users, false)

		.then(function(data){

			if(data.valid)
			{
				//check the session doesn't already exist
				return sessions.findOne(req.body);
			}
			else
			{
				return Promise.reject(data.info);
			}
		})

		.then((doc)=>{

			if(doc == null)
			{
				//okay we can make the module
				var s = req.body;
				s.teachers = [req.session.username];

				return sessions.insert(s);
				//add the session to the teacher


			}
			else
			{
				return Promise.reject("Error: session already exists");
			}
		})

		.then((doc)=>{
			//add the session id to the teacher
			users.update({username: req.session.username},{$addToSet: {sessions: doc._id}});
			res.send("new session created");
		})

		.catch((err)=>{
			res.status(400).send(err);
		})

	})

	app.post('/removefromsessions', (req,res) =>
	{
		//removes a user from all sessions
		//we actually need to do this before removing users
		var auth = {
			username: req.session.username,
			password: req.session.password
		}

		helpers.authenticateUser(auth, users, false)

		.then(function(data){

			if(data.valid)
			{
				//check the session doesn't already exist
				return sessions.update({},{$pull: {teachers: req.body.username}, multi: true});
			}
			else
			{
				return Promise.reject(data.info);
			}
		})

		.then((doc)=>
		{
			return users.update({username: req.body.username},{$set: {sessions: []}});
		})

		.then((doc)=>{
			res.send("user purged");
		})

		.catch((doc)=>{
			res.status(400).send(doc);
		})

	})

	app.post('/addinstructor', (req,res) =>
	{
		//add an instructor to a session
		//get a session document
		var auth = {
			username: req.session.username,
			password: req.session.password
		}

		helpers.authenticateForSession(auth, req.query._id)

		.then((data)=>{
			//find the teacher
			return users.findOne(req.body.instructor);
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
				//add the teacher and send the session doc
				users.update(data._id,{$addToSet: {sessions: req.body.session}});
				return sessions.update(req.body.session, {$addToSet: {teachers: data.username}});
			}
		})

		.then((data) =>{
			return sessions.findOne(req.body.session);
		})

		.then((data) =>{
			res.send(data);
		})

		.catch((err)=>{
			res.status(400).send(err);
		})
	})

	app.post('/removeinstructor', (req,res) =>
	{
		//TODO change teacher arrays to arrays of objects {_id:, username:, firstname: , lastname:  }
		//TODO change session arrays in users to {_id: , sessionname: }
		//TODO standardise to teacher not instructor across code base
		//TODO change session to class across codebase 

		//add an instructor to a session
		//get a session document
		var auth = {
			username: req.session.username,
			password: req.session.password
		}

		helpers.authenticateForSession(auth, req.query._id)

		.then((data)=>{
			//find the teacher
			return users.findOne({username: req.body.instructor});
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
				users.update(data._id,{$pull: {sessions: req.body.session}});
				return sessions.update(req.body.session, {$pull: {teachers: data.username}});
			}
		})

		.then((data) =>
		{
			//get the updated session
			return sessions.findOne(req.body.session);
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

module.exports = SessionManager;
