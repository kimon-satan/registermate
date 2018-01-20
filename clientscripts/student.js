$(document).ready(function()
{
	$('#register').on('click', function(e)
	{
		e.preventDefault();
		var un = $('#username').val().trim().toLowerCase();
		var r = /[a-z]{3,6}\d{3,4}/gi;

		if(r.test(un))
		{
			var req = $.get( server_url + "/findmyclass",{username: un}, function(res)
			{
				document.write(res);
			})

			req.fail(function(res){
				if(res.responseText)
				{
					alert(res.responseText);
				}
				else{
					alert(res);
				}
			})
		}
		else{
			alert("That doesn't look like a campus login.");
		}


	})
})
