const helpers = require('./serverHelpers.js');
const monk = require('monk');
const db = monk("localhost:27017/registermate");
const users = db.get('users');
const sessions = db.get('sessions');
const fs = require('fs');

var departmentData;

//TODO
//Sessions DB
/*
{
department: ,
module: ,
sessionname: ,
term: ,
students: [],
sessionarray: [date, date, blank, blank, blank, etc... ]
}
*/

function SessionManager(app)
{

	//LOAD THE HARDCODED DEPARTMENT DATA
	fs.readFile(__dirname + "/config/departmentinfo.json",
	function(err, data){
		//TODO insert module titles into DB if they don't exist ?
		departmentData = JSON.parse(data);
	})

	app.get('/departmentlist', (req,res) =>
	{
		var l = Object.keys(departmentData);
		l.sort();
	 	res.send(l);
	});
}

module.exports = SessionManager;
