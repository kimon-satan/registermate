function validateUserData(ud)
{
	var error = null;

	if(ud.username.length < 5)
	{
		error = "Username must be 5 characters or longer";
		return error;
	}
	if(ud.firstname.length < 1)
	{
		error = "You must enter a first name.";
		return error;
	}

	if(ud.surname.length < 1)
	{
		error = "You must enter a surname.";
		return error;
	}

	var pat = /^([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/
	if(!pat.test(ud.email))
	{
		error = "Invalid email address";
		return error;
	}

	error = validatePassword(ud);

	return error;
}

function validatePassword(ud)
{
	if(ud.password1.length < 8)
	{
		error = "Password must be 8 characters or more";
		return error;
	}

	if(ud.password1 != ud.password2)
	{
		error = "Passwords don't match";
		return error;
	}

	return null;
}
