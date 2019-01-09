$(document).ready(function()
{
	var classDoc;
	var updateProc;
	var numPresent = [0,0,0,0,0,0,0,0,0,0];
	var numStudents = 0;
	var modal_username;
	var modal_sessionnum;


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
		if(_id == "none")
		{
			alert("'none' is not a valid class");
			$("#classInput").val(classDoc._id);
			return;
		}
		var req = $.get(server_url +"/classdoc",{_id: _id} ,function(res){
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
			$('#lateTime').val(classDoc.latetime);



			updateRegister()
			.then(()=>{
				updateTableHeader();
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
		//TODO check whether students are engaged in another class and warn if necessary

		//open the register !
		classDoc.classpass = $('#password').val();
		classDoc.classpass = classDoc.classpass.trim();
		classDoc.classpass = classDoc.classpass.toLowerCase();

		if(classDoc.classpass.length == 0)
		{
			alert("You need to set a one time class pass first");
			return;
		}

		if(classDoc.sessionarray[classDoc.currentsession] != "U")
		{
			var c = confirm("The register has already been taken for this session once. Are you sure you want to open it again ?");
			if(!c)return;
		}

		$.post(server_url +"/openregister",
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
		$.post(server_url +"/closeregister",
		{class: classDoc._id},
		function(res){
			classDoc = res;
			updateRegister()
			.then(()=>{
				updateTableHeader();
				setHTMLClosed();
				window.clearInterval(updateProc);
			})
		})

	})

	$("#sessionInput").on("change", function(e)
	{
		var n = Number($("#sessionInput").val());

		$.post(server_url +"/changecurrentsession",
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

	$("#lateOverride").on("change", function(e)
	{
		if(classDoc != undefined || classDoc != "none")
		{
			classDoc.marklate = $('#' + e.target.id).prop('checked');
			$.post(server_url + '/setclassparameter', {class: classDoc._id, marklate: classDoc.marklate});
		}
		else
		{
			alert("select a class first")
		}
	})

	$("#lateTime").on("change", function(e)
	{
		if(classDoc != undefined || classDoc != "none")
		{
			classDoc.latetime = $('#' + e.target.id).val();
			$.post(server_url + '/setclassparameter', {class: classDoc._id, latetime: classDoc.latetime});
		}
		else
		{
			alert("select a class first")
		}
	})

	$('#emailAbsentees').on("click",function(e)
	{
		var r = $.get(server_url +"/absenteeemail", {
			class: classDoc._id,
			personaltext: $('#personalText').val()
		},
		function(res)
		{
			$('#emailBody').empty();
			$('#emailBody').append(res);
			$('#emailDialog').modal('toggle');
		});

	})

	$('#confirmEmail').on("click",function(e)
	{
		//confirm on click
		$.post(server_url +"/emailabsentees", {
			class: classDoc._id,
			personaltext: $('#personalText').val()
		},
		function(res)
		{
			alert(res);
		})
	})

	$('#download').on("click", function(e)
	{
		$.get(server_url +"/classregisterfile",
		{
			class: classDoc._id
		},
		function(res)
		{
			var fn = classDoc.classname + "_" + classDoc.currentsession + ".csv";
			fn = fn.replace(/[-\:\;"\,\'\|]/g, "");
			fn = fn.replace(/\s/g, "_");

			var csvContent = "data:text/csv;charset=utf-8," + res;
			var encodedUri = encodeURI(csvContent);
			var link = document.createElement("a");
			link.setAttribute("href", encodedUri);
			link.setAttribute("download", fn);
			link.click();
		})
	})



	$(document).on("click",".attendance",function(e){

		var elem = $('#' + e.target.id);
		modal_username = e.target.parentElement.id;
		modal_sessionnum = Number(elem.attr('sessionnum'));

		var str = "<p>Change " + modal_username + "'s status for session " + (modal_sessionnum + 1) + " to ... </p>";
		$('#toggleAttendanceBody').empty();
		$('#toggleAttendanceBody').append(str);
		$('#toggleAttendanceDialog').modal('toggle');

	})

	$(".tabutton").on("click",function(e)
	{
		var status = e.target.id.substring(0,1).toUpperCase();
		if(status == "P")status = "X";
		$.post(server_url +"/changestudentstatus",
		{
			class: classDoc._id,
			username: modal_username,
			sessionnum: modal_sessionnum,
			status: status
		}, function(){
			updateRegister().then(()=>{
				updateTableHeader();
			});
		});
	})




	function updateFunction()
	{

		var m = Date.now() - classDoc.sessionarray[classDoc.currentsession];
		var d = new Date(m);
		var t = [ String(Math.floor(m/(1000 * 60 * 60))), d.getMinutes().toString(), d.getSeconds().toString()];
		console.log(m,t);
		if(d.getSeconds()%30 == 0)
		{
			$.get(server_url +"/classdoc",{_id: classDoc._id} ,function(res)
			{
				classDoc = res;
				if(classDoc.classpass == null)
				{
					setHTMLClosed();
				}
			})
		}

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

		var np = numPresent[Number(classDoc.currentsession)];

		$('#numPresent').empty();
		$('#numPresent').append("<p><b>Total present: </b>" + np  + "</p>");

		$('#attendance').empty();
		$('#attendance').append("<p><b>Attendence: </b>" + (np*100/numStudents).toFixed(0) + "%</p>");

		updateRegister().then(()=>{
			updateTableHeader();
		})
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
		$('#lateOverride').prop('checked',classDoc.marklate == "true");
		var c = "session_" + (Number(classDoc.currentsession) + 1);
		$('th.'+c).removeClass("danger");
		$('th.'+c).addClass("success");
		$('#password').attr("disabled", "disabled");
	}

	function updateTableHeader(){
		//Load the table header
		$('#registerHeader').empty();
		var row = $('<tr class="table-bordered"></tr');
		row.append("<th>student</th>")
		for(var i = 0; i < classDoc.sessionarray.length; i++)
		{
			var str = "session " + (i + 1);
			if(classDoc.sessionarray[i] != "U")
			{
				str += "<br>" + "<p>" + (numPresent[i]*100/numStudents).toFixed(0) + "%</p>"
			}
			else
			{
				str += "<br>" + "<p>0%</p>"
			}
			var cell = $("<th class='session_" + (i+1) + "'>" + str + "</th>");
			row.append(cell);
		}
		$('#registerHeader').append(row);

		var c = "session_" + (Number(classDoc.currentsession) + 1);
		if(classDoc.classpass != null)
		{
			$('th.'+c).addClass("success");
		}
	}

	function updateRegister()
	{
		//load the students
		var p = new Promise(function(resolve, reject){
			var req = $.get(server_url +"/classstudents", {_id: classDoc._id}, function(res){
				$('#registerBody').empty();

				numStudents = res.length;
				numPresent = [];
				for(var i = 0; i < classDoc.sessionarray.length; i++){
					numPresent.push(0);
				}


				for(var i = 0; i < res.length; i++)
				{

					var row = $('<tr id="' + res[i].username + '"></tr>');
					row.append($('<td>'+ res[i].surname + ", " + res[i].firstname + ", " + res[i].username + '</td>'));
					for(var j = 0; j < res[i].attendance.length; j++)
					{
						var cell = $("<td id='register_" + i + "_" + j + "'>" + res[i].attendance[j] + "</td>");
						cell.addClass("attendance");
						cell.attr("sessionnum", j);
						if(res[i].attendance[j] == "X")
						{
							cell.addClass("present");
							numPresent[j] += 1;
						}
						else if(res[i].attendance[j] == "L")
						{
							cell.addClass("late");
							numPresent[j] += 1;
						}
						else if(res[i].attendance[j] == "A")
						{
							cell.addClass("absent");
						}
						row.append(cell);
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
