$('#submit').on('click', function(e){

	var ud = {};
	ud.username = $('#username').val();
	ud.password = $('#password').val();


	e.preventDefault();

	var req = $.post(
		server_url + "/login", ud, function(res)
		{
			document.write(res);
		}
	)

	req.fail(function(res){
		alert(res.responseText);
	})


})
