$(document).ready(function(){

	var classDoc;
	//Load the user's classes
	var req = $.get(server_url + "/userclasses", function(res){
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
	$.get(server_url +"/departmentlist",function(res)
	{
		for(var i = 0; i < res.length; i++)
		{
			$('#departmentInput').append("<option value='"+ res[i] +"'>" + res[i] + "</option>");
		}
	});

	//set up num sessions

	for(var i =1; i < 25; i++)
	{
		$('#numSessionsInput').append("<option value=" + i + ">" + i +"</option>");
	}
	$('#numSessionsInput').val(10);

	$("#departmentInput").on("change", function(e)
	{
		var department = $('#departmentInput').val();
		$.get(server_url +"/teachers", {department: department}, function(res)
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
		var req = $.get(server_url +"/classdoc",{_id: _id} ,function(res){
			classDoc = res;
			updateTeachers();
			updateStudents();
			$('#numSessionsInput').val(classDoc.sessionarray.length);
		})
		req.fail(function(err){
			alert(err);
		});

	});

	$("#numSessionsButton").on("click", function(e)
	{
		if(classDoc == undefined)
		{
			alert("Choose a class first.");
			return;
		}

		var n = $('#numSessionsInput').val();
		var c;

		if(n == classDoc.sessionarray.length)
		{
			alert("There are already " + n + " sessions in this class.");
			c = false;
		}
		else if(n < classDoc.sessionarray.length)
		{
			//fire a warning
			var str = "Warning: you are reducing the number of sessions.\n";
			str += "This can result in lost data.\n";
			str += "Are you sure you want to do this ?\n";
			c = confirm(str);
		}
		else
		{
			c = true;
		}

		if(c)
		{
			$.post(server_url +"/changenumsessions", {class: classDoc._id, num: n}, function(res)
			{
				classDoc = res;
				alert("All records have been updated. There are now " + classDoc.sessionarray.length + " sessions in this class.");
			});
		}


	})

	$("#addTeacher").on("click", function(e)
	{
		if(classDoc == undefined)
		{
			alert("Choose a class first.");
			return;
		}


		var _id = $("#teacherInput").val();

		if(_id == "none")
		{
			alert("Choose a teacher first.");
			return;
		}
		var req = $.post(server_url +"/addteacher", {class: classDoc._id, teacher: _id},
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
			var str = "Are you sure you want to remove " + classDoc.classname;
			str += ".\nAll data will be lost.";
			str += ".\nThis action cannot be undone.";
			var c = confirm(str);
			if(c)
			{
				$.post(server_url +"/removeclass", {class: classDoc._id}, function(res){
					window.location = server_url + "/teacher";
				})
			}
		}
	})

	$(document).on("click", ".remove_teacher", function(e)
	{
		var str = "Are you sure you want to remove " + e.target.name + "?";
		if(confirm(str))
		{
			var _id = e.target.id;
			var req = $.post(server_url +"/removeteacher", {class: classDoc._id, teacher: _id},
			function(res)
			{
			 classDoc = res;
				updateTeachers();
			})
		}
	});

	$(document).on("click", ".remove_student", function(e)
	{
		var str = "Are you sure you want to remove " + e.target.name + " from " + classDoc.classname +"?\n"
		str += "Their data will be deleted.\nThis action can't be undone."
		if(confirm(str))
		{
			var _id = e.target.id;
			var req = $.post(server_url +"/removestudentfromclass", {class: classDoc._id, student: _id},
			function(res)
			{
				updateStudents();
			})
		}
	});

	$('#addStudents').on("click", function(e){

		if(classDoc == undefined)
		{
			alert("choose a class first");
			return;
		}

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
				var b = confirm("line " + i + "\n\n'" + lines[i] +"'\n\n is formatted incorrectly and has not been added.\n" );
				if(!b)
				{
					studentsArray = []; //we won't add any students then
					break;
				}
			}
		}

		if(studentsArray.length > 0)
		{
			$.post(server_url +"/addstudents", {class: classDoc._id, students: studentsArray}, function(res)
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
			var teacherStr = classDoc.teachers[i].firstname + ", " +classDoc.teachers[i].surname + ", " + classDoc.teachers[i].username;
			var row = $('<tr></tr>');
			row.append($('<td>'+ teacherStr + '</td>'));
			row.append($('<td><button class="btn btn-xs btn-danger remove_teacher" id="' + classDoc.teachers[i]._id + '" name="' + teacherStr +'">remove from class</button></td>'));
			$('#teachersTable').append(row);
		}

	}

	function updateStudents()
	{
		$('#studentsTable').empty();
		var req = $.get(server_url +"/classstudents", {_id: classDoc._id}, function(res){
			for(var i = 0; i < res.length; i++)
			{
				var row = $('<tr></tr>');
				row.append($('<td>'+ res[i].surname + '</td>'));
				row.append($('<td>'+ res[i].firstname + '</td>'));
				row.append($('<td>'+ res[i].username + '</td>'));
				row.append($('<td><button class="btn btn-xs btn-danger remove_student" id="' + res[i]._id + '" name="'+res[i].firstname + ' ' + res[i].surname +'">remove from class</button></td>'));
				$('#studentsTable').append(row);
			}
		})
		req.fail(function(res){
			console.log(res);
		})
	}

});
