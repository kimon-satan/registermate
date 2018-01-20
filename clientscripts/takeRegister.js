$(document).ready(function()
{
	var classDoc;
	var updateProc;
	var numPresent;
	var numStudents;


	//close both panels
	$("#openPanel").addClass("hidden");
	$("#closePanel").addClass("hidden");
	$("#closeDiv").addClass("hidden");

	//Load the user's classes
	var req = $.get(server_url + "/userclasses", function(res){

		var sInput = $('#classInput')
		for(var i = 0; i < res.length; i++)
		{
			var o = $('<option value="' + res[i]._id + '">' + res[i].classname + '</option>');
			sInput.append(o);
		}
	})

	$("#classInput").on("change", function(e)
	{

		var _id = $("#classInput").val();
		if(_id == "none")classDoc = undefined;
		var req = $.get("/classdoc",{_id: _id} ,function(res){
			classDoc = res;
			//updateStudents();
			$('#sessionInput').empty();

			for(var i = 0; i < classDoc.sessionarray.length; i++)
			{
				var s = (i + 1) + " of " + classDoc.sessionarray.length;
				var o = $("<option value = " + i + ">" + s +"</option>");
				if(classDoc.sessionarray[i] != "U")
				{
					o.css("font-style", "italic");
				}
				$('#sessionInput').append(o);
			}

			$('#sessionInput').val(classDoc.currentsession);

			//Load the table header
			$('#registerHeader').empty();
			var row = $('<tr class="table-bordered"></tr');
			row.append("<th>student</th>")
			for(var i = 0; i < classDoc.sessionarray.length; i++)
			{
				var cell = $("<th class='session_" + (i+1) + "'>session "+ (i + 1) + "</th>");
				row.append(cell);
			}
			$('#registerHeader').append(row)

			updateRegister()
			.then(()=>{
				if(!classDoc.classpass)
				{
					setHTMLClosed();
				}
				else
				{
					setHTMLOpen();
					updateProc = window.setInterval(updateFunction,1000); //update once a second
				}
			})

		})
		req.fail(function(err){
			alert(err);
		});

	});

	$("#start").click(function()
	{
		//TODO check that a passphrase has been entered
		//TODO check whether students are engaged in another class and warn if necessary

		//open the register !
		classDoc.classpass = $('#password').val();
		classDoc.classpass = classDoc.classpass.trim();
		classDoc.classpass = classDoc.classpass.toLowerCase();

		$.post("/openregister",
		{class: classDoc._id, classpass: classDoc.classpass},
		function(res){
			classDoc = res;
			setHTMLOpen();
			updateProc = window.setInterval(updateFunction,1000); //update once a second
		})


	})

	$("#end").click(function()
	{
		//close the register !
		$.post("/closeregister",
		{class: classDoc._id},
		function(res){
			classDoc = res;
			updateRegister()
			.then(()=>{
				setHTMLClosed();
				window.clearInterval(updateProc);
			})
		})

	})

	$("#sessionInput").on("change", function(e)
	{
		var n = Number($("#sessionInput").val());
		$.post("/changecurrentsession",
		{class: classDoc._id, currentsession: n},
		function(res)
		{
			classDoc = res;
			$('th').removeClass("success");
			$('th').removeClass("danger");

			if(!classDoc.classpass)
			{
				setHTMLClosed();
			}
			else
			{
				setHTMLOpen();
			}
		});

	})

	//TODO click on student cell to toggle registration
	//TODO late functionality
	//TODO send email
	//TODO download csv

	function updateFunction()
	{
		var m = Date.now() - classDoc.sessionarray[classDoc.currentsession];
		var d = new Date(m);
		var t = [ d.getHours().toString(), d.getMinutes().toString(), d.getSeconds().toString()];

		for(var i = 0; i < 3; i++)
		{
			var pad = "00";
			t[i] = (pad+t[i]).slice(-pad.length);
		}

		var str = t[0] + ":" + t[1] + ":" + t[2];

		$('#timeOpen').empty();
		$('#timeOpen').append("<p><b>Time open: </b>" + str + "</p>");

		$('#numStudents').empty();
		$('#numStudents').append("<p><b>Total students: </b>" + numStudents + "</p>");

		$('#numPresent').empty();
		$('#numPresent').append("<p><b>Total present: </b>" + numPresent + "</p>");

		$('#attendance').empty();
		$('#attendance').append("<p><b>Attendence: </b>" + (numPresent*100/numStudents).toFixed(0) + "%</p>");

		updateRegister();
	}

	function setHTMLClosed()
	{
		$('#password').removeAttr("disabled");
		$('#sessionInput').removeAttr("disabled");
		$("#openPanel").addClass("hidden");
		$("#closePanel").removeClass("hidden");
		$("#closeDiv").addClass("hidden");
		$("#openDiv").removeClass("hidden");
		var c = "session_" + (Number(classDoc.currentsession) + 1);
		$('th.'+c).removeClass("success");
		$('th.'+c).addClass("danger");

	}

	function setHTMLOpen()
	{
		$('#sessionInput').attr("disabled", "disabled");
		$("#closePanel").addClass("hidden");
		$("#openPanel").removeClass("hidden");
		$("#closeDiv").removeClass("hidden");
		$("#openDiv").addClass("hidden");
		var c = "session_" + (Number(classDoc.currentsession) + 1);
		$('th.'+c).removeClass("danger");
		$('th.'+c).addClass("success");
		$('#password').attr("disabled", "disabled");
	}

	function updateRegister()
	{
		//load the students
		var p = new Promise(function(resolve, reject){
			var req = $.get("/classstudents", {_id: classDoc._id}, function(res){
				$('#registerBody').empty();

				numStudents = res.length;
				numPresent = 0;

				for(var i = 0; i < res.length; i++)
				{
					var row = $('<tr></tr>');
					row.append($('<td>'+ res[i].surname + ", " + res[i].firstname + ", " + res[i].username + '</td>'));
					for(var j = 0; j < res[i].attendance.length; j++)
					{
						row.append($("<td class='session_" + (j+1) + "'>" + res[i].attendance[j] + "</td>"));
						if(res[i].attendance[j] == "X" || res[i].attendance[j] == "L")
						{
							numPresent += 1;
						}
					}
					$('#registerBody').append(row);
				}
				resolve();
			})
			req.fail(function(res){
				console.log(res);
				reject();
			})
		})
		return p;
	}

})
