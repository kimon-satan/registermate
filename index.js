const express = require('express');
const app = express();
const monk = require('monk');
const db = monk("localhost:27017/registermate");
const bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

db.then(() => {
	console.log('Connected correctly to server')
})

const users = db.get('users')
const students = db.get('students')

app.use("/libs",express.static(__dirname + '/libs'));
app.use("/html",express.static(__dirname + '/html'));

app.get('/', (req, res) => res.sendFile(__dirname + '/html/student.html'))
app.get('/student', (req, res) => res.sendFile(__dirname + '/html/student.html'))
app.get('/teacher', (req, res) => res.send('Hello Teacher!'))
app.get('/admin' , (req, res) =>
	{
		users.findOne({})
		.then(
			(doc) =>
			{
				if(doc == null)
				{
					res.sendFile(__dirname + '/html/createadmin.html')
				}
				else
				{
					res.send('Login Admin!')
				}
			}
		)
	}
)

app.post('/newadmin', (req, res) =>
	{
		console.log(req.body);
	}
)





app.listen(3000, () => console.log('Example app listening on port 3000!'))
