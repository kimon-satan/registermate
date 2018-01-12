const express = require('express');
const app = express();
const monk = require('monk');
const db = monk("localhost:27017/ConditionalLove");

app.get('/', (req, res) => res.send('Hello Student!'))
app.get('/student', (req, res) => res.sendFile(__dirname + '/html/student.html'))
app.get('/teacher', (req, res) => res.send('Hello Teacher!'))

app.use("/libs",express.static(__dirname + '/libs'));

app.listen(3000, () => console.log('Example app listening on port 3000!'))
