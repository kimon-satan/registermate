$(document).ready(function(e) {

	$.get(server_url +"/departmentlist",function(res)
	{
		for(var i = 0; i < res.length; i++)
		{
			$('#departmentInput').append("<option value='"+ res[i] +"'>" + res[i] + "</option>");
		}

	});
})

$('#submit').on('click', function(e){

	var ud = {};
	ud.username = $('#username').val();
	ud.email = $('#email').val();
	ud.password1 = $('#password1').val();
	ud.password2 = $('#password2').val();
	ud.firstname = $('#firstname').val();
	ud.surname = $('#surname').val();
	ud.department = $('#departmentInput').val();
	e.preventDefault();
	var error = validateUserData(ud);

	if(error == null)
	{
		$.post(
			server_url + "/createaccount", ud, function(res)
			{
				document.write(res);
			}
		)
		.fail(function(res){
			alert(res.responseText);
		})
	}
	else
	{
			alert(error);
	}

})
