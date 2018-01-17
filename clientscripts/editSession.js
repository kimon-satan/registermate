$(document).ready(function(){

	//Load the user's sessions
	var req = $.get("usersessions", function(res){
		console.log(res)
		var sInput = $('#sessionInput')
		for(var i = 0; i < res.length; i++)
		{
			var o = $('<option value="' + i + '">' + res[i].sessionname + '</option>');
			sInput.append(o);
		}
	})
	req.fail(function(err){
		alert(err);
	});

	//load department list
	$.get("/departmentlist",function(res)
	{
		for(var i = 0; i < res.length; i++)
		{
			$('#departmentInput').append("<option value='"+ res[i] +"'>" + res[i] + "</option>");
		}

	});

	$("#departmentInput").on("change", function(e)
	{
		var department = $('#departmentInput').val();
		$.get("/instructors", {department: department}, function(res)
		{
			$('#instructorInput').empty();
			for(var i = 0; i < res.length; i++)
			{
				$('#instructorInput').append("<option value='"+ res[i]._id +"'>" + res[i].firstname + ", " + res[i].surname + ", " + res[i].username + "</option>");
			}
		})
	});



});
