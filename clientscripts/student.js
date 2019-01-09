$(document).ready(function()
{
	$('#register').on('click', function(e)
	{
		e.preventDefault();
		var un = $('#username').val().trim().toLowerCase();
		var r = /([a-z]{2,7}\d{0,4}[a-z]{0,3})/gi;

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
