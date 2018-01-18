$(document).ready(function(){

	var sessionDoc = {};
	//Load the user's sessions
	var req = $.get("usersessions", function(res){
		console.log(res)
		var sInput = $('#sessionInput')
		for(var i = 0; i < res.length; i++)
		{
			var o = $('<option value="' + res[i]._id + '">' + res[i].sessionname + '</option>');
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

	$("#sessionInput").on("change", function(e)
	{
		//TODO deal with none
		var _id = $("#sessionInput").val();
		var req = $.get("/sessiondoc",{_id: _id} ,function(res){
			sessionDoc = res;
			console.log(res);
			updateInstructors();
		})
		req.fail(function(err){
			alert(err);
		});

	});

	$("#addInstructor").on("click", function(e)
	{
		//TODO deal with none
		var _id = $("#instructorInput").val();
		var req = $.post("/addinstructor", {session: sessionDoc._id, instructor: _id},
		function(res){
			sessionDoc = res;
			updateInstructors();
		})
	});

	$(document).on("click", ".remove", function(e)
	{
		var un = e.target.id;
		var req = $.post("/removeinstructor", {session: sessionDoc._id, instructor: un},
		function(res)
		{
			sessionDoc = res;
			updateInstructors();
		})
	});


	function updateInstructors()
	{
		$('#instructorsTable').empty();
		for(var i = 0; i < sessionDoc.teachers.length; i++)
		{
			var row = $('<tr></tr>');
			row.append($('<td>' + sessionDoc.teachers[i] + '</td>'));
			row.append($('<td><button class="btn btn-xs btn-danger remove" id="' + sessionDoc.teachers[i] + '">remove</button></td>'));
			$('#instructorsTable').append(row);
		}

	}

});
