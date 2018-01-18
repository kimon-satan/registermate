$(document).ready(function(){

	var classDoc;
	//Load the user's classes
	var req = $.get("userclasses", function(res){
		console.log(res)
		var sInput = $('#classInput')
		var iInput = $('#importInput')
		for(var i = 0; i < res.length; i++)
		{
			var o = $('<option value="' + res[i]._id + '">' + res[i].classname + '</option>');
			sInput.append(o);
			iInput.append(o.clone());
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

		var _id = $("#classInput").val();
		if(_id == "none")classDoc = undefined;
		var req = $.get("/classdoc",{_id: _id} ,function(res){
			classDoc = res;
			updateTeachers();
			updateStudents();
		})
		req.fail(function(err){
			alert(err);
		});

	});

	$("#addTeacher").on("click", function(e)
	{
		if(classDoc == undefined)
		{
			alert("choose a class first");
			return;
		}
		var _id = $("#teacherInput").val();
		var req = $.post("/addteacher", {class: classDoc._id, teacher: _id},
		function(res){
		 classDoc = res;
			updateTeachers();
		})
	});

	$('#removeClass').on("click", function(e)
	{
		if(classDoc == undefined)
		{
			alert("choose a class first");
			return;
		}
		else
		{
			var c = confirm("Are you sure you want to remove this class.\nThis action cannot be undone.");
			if(c)
			{
				$.post("/removeclass", {class: classDoc._id}, function(res){
					window.location = server_url + "/teacher";
				})
			}
		}
	})

	$(document).on("click", ".remove_teacher", function(e)
	{
		if(confirm("Are you sure you want to remove ?"))
		{
			var _id = e.target.id;
			var req = $.post("/removeteacher", {class: classDoc._id, teacher: _id},
			function(res)
			{
			 classDoc = res;
				updateTeachers();
			})
		}
	});

	$(document).on("click", ".remove_student", function(e)
	{
		if(confirm("Are you sure you want to remove ?"))
		{
			var _id = e.target.id;
			var req = $.post("/removestudentfromclass", {class: classDoc._id, student: _id},
			function(res)
			{
				updateStudents();
			})
		}
	});

	$('#addStudents').on("click", function(e){

		var raw = $('#newStudents').val();
		lines = raw.split(/[\r\n]/);

		var studentsArray = [];
		for(var i = 0; i < lines.length; i++)
		{
			//remove whitespace
			var l = lines[i].replace(/[\s\t]/g, '');
			var r = /^([a-z\-\']*),([a-z\-\']*),([a-z]{3,6}\d{3,4})$/gi;
			if(l.length == 0)continue;
			var res = r.exec(l);
			if(res != null)
			{
				studentsArray.push({surname: capitalize(res[1]), firstname: capitalize(res[2]), username: res[3].toLowerCase()});
			}
			else
			{
				alert("line " + i + "\n\n'" + lines[i] +"'\n\n is formatted incorrectly and has not been added.\n" );
			}
		}

		if(studentsArray.length > 0)
		{
			$.post("/addstudents", {class: classDoc._id, students: studentsArray}, function(res)
			{
				alert(res);
				updateStudents();
			});
		}

	})


	function updateTeachers()
	{
		$('#teachersTable').empty();
		for(var i = 0; i < classDoc.teachers.length; i++)
		{
			var row = $('<tr></tr>');
			row.append($('<td>'+ classDoc.teachers[i].firstname + ", " +classDoc.teachers[i].surname + ", " + classDoc.teachers[i].username + '</td>'));
			row.append($('<td><button class="btn btn-xs btn-danger remove_teacher" id="' + classDoc.teachers[i]._id + '">remove</button></td>'));
			$('#teachersTable').append(row);
		}

	}

	function updateStudents()
	{
		$('#studentsTable').empty();
		var req = $.get("/classstudents", {_id: classDoc._id}, function(res){
			for(var i = 0; i < res.length; i++)
			{
				var row = $('<tr></tr>');
				row.append($('<td>'+ res[i].surname + '</td>'));
				row.append($('<td>'+ res[i].firstname + '</td>'));
				row.append($('<td>'+ res[i].username + '</td>'));
				row.append($('<td><button class="btn btn-xs btn-danger remove_student" id="' + res[i]._id + '">remove</button></td>'));
				$('#studentsTable').append(row);
			}
		})
		req.fail(function(res){
			console.log(res);
		})
	}

});
