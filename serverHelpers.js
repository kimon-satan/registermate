const pwhasher = require('password-hash-and-salt');

exports.saltAndHash = function(pw)
{
	var p = new Promise(function(resolve, reject){
		pwhasher(pw).hash(function(e,h){
			resolve(h);
		})
	})

	return p;
}

exports.authenticateUser = function(ud,db)
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
							resolve({valid: true, info:"User found"});
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
