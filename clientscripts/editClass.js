$(document).ready(function(){

	var classDoc = {};
	//Load the user's classes
	var req = $.get("userclasses", function(res){
		console.log(res)
		var sInput = $('#classInput')
		for(var i = 0; i < res.length; i++)
		{
			var o = $('<option value="' + res[i]._id + '">' + res[i].classname + '</option>');
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
		$.get("/teachers", {department: department}, function(res)
		{
			$('#teacherInput').empty();
			for(var i = 0; i < res.length; i++)
			{
				$('#teacherInput').append("<option value='"+ res[i]._id +"'>" + res[i].firstname + ", " + res[i].surname + ", " + res[i].username + "</option>");
			}
		})
	});

	$("#classInput").on("change", function(e)
	{
		//TODO deal with none
		var _id = $("#classInput").val();
		var req = $.get("/classdoc",{_id: _id} ,function(res){
		 classDoc = res;
			console.log(res);
			updateTeachers();
		})
		req.fail(function(err){
			alert(err);
		});

	});

	$("#addTeacher").on("click", function(e)
	{
		//TODO deal with none
		var _id = $("#teacherInput").val();
		var req = $.post("/addteacher", {class: classDoc._id, teacher: _id},
		function(res){
		 classDoc = res;
			updateTeachers();
		})
	});

	$(document).on("click", ".remove", function(e)
	{
		var _id = e.target.id;
		var req = $.post("/removeteacher", {class: classDoc._id, teacher: _id},
		function(res)
		{
		 classDoc = res;
			updateTeachers();
		})
	});


	function updateTeachers()
	{
		$('#teachersTable').empty();
		for(var i = 0; i < classDoc.teachers.length; i++)
		{
			var row = $('<tr></tr>');
			row.append($('<td>'+ classDoc.teachers[i].firstname + ", " +classDoc.teachers[i].surname + ", " + classDoc.teachers[i].username + '</td>'));
			row.append($('<td><button class="btn btn-xs btn-danger remove" id="' + classDoc.teachers[i]._id + '">remove</button></td>'));
			$('#teachersTable').append(row);
		}

	}

});
