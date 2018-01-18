const pwhasher = require('password-hash-and-salt');
const monk = require('monk');
const db = monk("localhost:27017/registermate");
const users = db.get('users');
const sessions = db.get('sessions');

exports.saltAndHash = function(pw)
{
	var p = new Promise(function(resolve, reject){
		pwhasher(pw).hash(function(e,h){
			resolve(h);
		})
	})

	return p;
}

exports.authenticateUser = function(ud,db,requireAdmin)
{

	var p = new Promise(function(resolve, reject){

		db.findOne({username: ud.username})
		.then((doc) =>
			{
				if(doc != null)
				{
					pwhasher(ud.password).verifyAgainst(doc.hash, function(error, verified){

						if(verified)
						{
							if(!requireAdmin || doc.role == "admin")
							{
								resolve({valid: true, info:"User authenicated", role: doc.role});
							}
							else
							{
								resolve({valid: false, info:"User is not admin"});
							}
						}
						else
						{
							resolve({valid: false, info:"Incorrect password"});
						}

					})

				}
				else
				{
					//check there are any admins at all
					db.findOne({})
					.then(
						(doc) =>
						{
							if(doc == null)
							{
								resolve({valid: true, info: "First user"});
							}
							else
							{
								resolve({valid: false, info: "Invalid user id"});
							}
						}
					)
				}
			}
		)
	})

	return p;

}

exports.authenticateForSession = function(user, session_id)
{
	//user is {password, username}
	var p = new Promise(function(resolve, reject)
	{

		var role;

		exports.authenticateUser(user, users, false)

		.then(function(data){

			if(data.valid)
			{
				//find the session
				role = data.role;
				return sessions.findOne(session_id);
			}
			else
			{
				return Promise.reject(data.info);
			}
		})

		.then((data)=>
		{
			if(data == null)
			{
				//couldn't find the session
				reject("Session not found");
			}
			else
			{
				//check the user is attached to session or is admin
				if(data.teachers.includes(user.username) || role == "admin")
				{
					//find the teacher
					resolve("Authorised");
				}
				else
				{
					reject("Unauthorised request");
				}
			}

		})

		.catch((err) => {
			reject(err);
		});
	});
	return p;
}

exports.generateToken = function()
{
	var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	var id = "";
	for(var i = 0; i < 24; i++)
	{
		let j = Math.floor(Math.random() * chars.length);
		id += chars[j];
	}
	return id;
}
