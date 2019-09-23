$(document).ready(function()
{
	$('#register').on('click', function(e)
	{
		e.preventDefault();
		var un = $('#username').val().trim().toLowerCase();
		var r = /([a-z]{2,7}\d{0,4}[a-z]{0,3})/gi;

		var a = $("<p>Something not right ? Report a problem <a href='https://learn.gold.ac.uk/mod/questionnaire/view.php?id=715371'>here</a></p>");

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
					$('#student').append(a);
				}
				else{
					alert(res);
					$('#student').append(a);
				}
			})
		}
		else{
			alert("That doesn't look like a campus login.");
		}


	})
})
