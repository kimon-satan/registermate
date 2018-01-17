
$(document).ready(function(){

	var sessionModules = [];
	var moduleList = [];
	var isMultiple = false;
	var sessionDoc = {};

	$.get("/departmentlist",function(res)
	{
		for(var i = 0; i < res.length; i++)
		{
			$('#departmentInput').append("<option value='"+ res[i] +"'>" + res[i] + "</option>");
		}

	})

	$("#departmentInput").on("change", function(e)
	{
		var department = $('#departmentInput').val();
		$.get("/modulelist", {department: department}, function(res)
		{
			$('#moduleInput').empty();
			moduleList = res;
			for(var i = 0; i < res.length; i++)
			{
				$('#moduleInputSingle').append("<option value='"+ i +"'>" + res[i].code + "," + res[i].title + "</option>");
				$('#moduleInputMultiple').append("<option value='"+ i +"'>" + res[i].code + "," + res[i].title + "</option>");
			}
		})
	});

	$("#multiple").on("click", function(e)
	{
		isMultiple = e.target.checked;
		if(isMultiple)
		{
			$('#modulePanel').removeClass("hidden");
			$('#moduleSinglePanel').addClass("hidden");
		}
		else{
			$('#modulePanel').addClass("hidden");
			$('#moduleSinglePanel').removeClass("hidden");
		}
		updateSessionDoc();
	})

	$("#termInput, #moduleInputSingle, #typeInput").on("change", function(e)
	{
		updateSessionDoc();
	});

	$("#customLabel").on("keyup", function(e){
		updateSessionDoc();
	})

	$("#addExisting").on("click", function(e)
	{

		var m = $('#moduleInputMultiple').val();
		if(m != "none")
		{
			//check module hasn't already been added
			if(!sessionModules.includes(moduleList[m]))
			{
				sessionModules.push(moduleList[m]);
				updateSessionModules();
				updateSessionDoc();
			}
			else{
				alert("Module already added");
			}
		}
		else
		{
			alert("can't add none");
		}
	})


	$("#createSession").on("click", function(e)
	{

		if(validateSessionDoc())
		{
			var req = $.post(server_url + "/createsession", sessionDoc ,function(res){
				//TODO move to next stage
				alert("Congratulations !\nYour session has been created.\nNow lets add some students and teachers...");

			});

			req.fail(function(res){
				alert(res.responseText);
			})

			req.done(function()
			{
				window.location = server_url + "/editsession";
			})
		}

	})

	$(document).on("click", ".remove", function(e){
		sessionModules.splice(e.target.id, 1);
		updateSessionModules();
		updateSessionDoc();
	})

	function updateSessionDoc()
	{
		sessionDoc.department = $('#departmentInput').val();

		if(isMultiple)
		{
			sessionDoc.modules = sessionModules;
		}
		else
		{
			var m = $('#moduleInputSingle').val();
			sessionDoc.module = moduleList[m];
		}
		sessionDoc.sessiontype = $('#typeInput').val();
		sessionDoc.sessionname = $('#newSession').val();
		sessionDoc.term = $('#termInput').val();
		sessionDoc.customLabel = $('#customLabel').val();

		updateSessionName();
	}

	function updateSessionName()
	{
		console.log(sessionDoc);
		var sn = "";
		if(isMultiple)
		{
			for(var i = 0; i < sessionDoc.modules.length; i++)
			{
				sn += sessionDoc.modules[i].code;
				if(i < sessionDoc.modules.length -1)
				{
					sn += "&";
				}
			}
		}
		else
		{
			if(sessionDoc.module != undefined)sn += sessionDoc.module.title;
		}

		sn += ": "
		if(sessionDoc.sessiontype != undefined)sn += sessionDoc.sessiontype;
		if(sessionDoc.term != "none")sn += " - " + sessionDoc.term;
		if(sessionDoc.customLabel.length > 0)sn += " - " + sessionDoc.customLabel;

		sessionDoc.sessionname = sn;


		$("#sessionName").empty();
		$("#sessionName").append(sessionDoc.sessionname);
	}

	function validateSessionDoc()
	{
		//validate record
		//department
		//module or modules
		if(sessionDoc.department == "none" || sessionDoc.department == undefined)
		{
			alert("You must set a value for department");
			return false;
		}

		if(isMultiple)
		{
			if(sessionDoc.modules.length < 0)
			{
				alert("You must add at least one module");
				return false;
			}
		}
		else
		{
			if(sessionDoc.module == "none" || sessionDoc.module == undefined)
			{
				alert("You must set a module");
				return false;
			}
		}

		return true;
	}

	function updateSessionModules()
	{
		$('#sessionModules').empty();
		for(var i = 0; i < sessionModules.length; i++)
		{
			let m = "";
			if(sessionModules[i].code != undefined)
			{
				m +=  sessionModules[i].code + ", "
			}
			m += sessionModules[i].title;
			var row = $("<tr></tr>");
			row.append("<td>" + m + "</td>");
			row.append("<td><button class='btn btn-danger btn-sm remove' id='" + i + "'>remove</button></td>")
			$('#sessionModules').append(row);
		}
	}


})
