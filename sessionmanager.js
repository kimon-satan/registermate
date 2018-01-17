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
		res.send(departmentList);
	});

	app.get('/modulelist', (req,res) =>
	{
		departmentData.find(req.query,{sort: {code: 1}, fields: {title: 1, code: 1}})
		.then((doc) => {
			res.send(doc);
		})

	});

	app.get('/usersessions', (req,res) =>{
		sessions.find({teachers: req.session.username},
			{sort: {sessionname: 1},fields: {sessionname: 1}})
		.then((doc)=>{
			res.send(doc);
		})
	})

	app.post('/createsession', (req,res) =>{

		var auth = {
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

	app.post('/removefromsessions', (req,res) =>{
		var auth = {
			username: req.session.username,
			password: req.session.password
		}

		helpers.authenticateUser(auth, users, false)

		.then(function(data){

			if(data.valid)
			{
				//check the session doesn't already exist
				return sessions.update({},{$pull: {teachers: req.body.username}});
			}
			else
			{
				return Promise.reject(data.info);
			}
		})

		.then((doc)=>{
			return users.update({username: req.body.username},{$set: {sessions: []}});

		})

		.then((doc)=>{
			res.send("user purged");
		})

		.catch((doc)=>{
			res.status(400).send(doc);
		})


	})


}

module.exports = SessionManager;
