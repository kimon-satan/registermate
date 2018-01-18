
$(document).ready(function(){

	var classModules = [];
	var moduleList = [];
	var isMultiple = false;
	var classDoc = {};

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
		updateClassDoc();
	})

	$("#termInput, #moduleInputSingle, #typeInput").on("change", function(e)
	{
		updateClassDoc();
	});

	$("#customLabel").on("keyup", function(e){
		updateClassDoc();
	})

	$("#addExisting").on("click", function(e)
	{

		var m = $('#moduleInputMultiple').val();
		if(m != "none")
		{
			//check module hasn't already been added
			if(!classModules.includes(moduleList[m]))
			{
			 classModules.push(moduleList[m]);
				updateClassModules();
				updateClassDoc();
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


	$("#createClass").on("click", function(e)
	{

		if(validateClassDoc())
		{
			var req = $.post(server_url + "/createclass", classDoc ,function(res){
				//TODO move to next stage
				alert("Congratulations !\nYour class has been created.\nNow lets add some students and teachers...");

			});

			req.fail(function(res){
				alert(res.responseText);
			})

			req.done(function()
			{
				window.location = server_url + "/editclass";
			})
		}

	})

	$(document).on("click", ".remove", function(e){
	 classModules.splice(e.target.id, 1);
		updateClassModules();
		updateClassDoc();
	})

	function updateClassDoc()
	{
	 classDoc.department = $('#departmentInput').val();

		if(isMultiple)
		{
		 classDoc.modules = classModules;
		}
		else
		{
			var m = $('#moduleInputSingle').val();
		 classDoc.module = moduleList[m];
		}
	 classDoc.classtype = $('#typeInput').val();
	 classDoc.classname = $('#newClass').val();
	 classDoc.term = $('#termInput').val();
	 classDoc.customLabel = $('#customLabel').val();

		updateClassName();
	}

	function updateClassName()
	{
		console.log(classDoc);
		var sn = "";
		if(isMultiple)
		{
			for(var i = 0; i < classDoc.modules.length; i++)
			{
				sn += classDoc.modules[i].code;
				if(i < classDoc.modules.length -1)
				{
					sn += "&";
				}
			}
		}
		else
		{
			if(classDoc.module != undefined)sn += classDoc.module.title;
		}

		sn += ": "
		if(classDoc.classtype != undefined)sn += classDoc.classtype;
		if(classDoc.term != "none")sn += " - " + classDoc.term;
		if(classDoc.customLabel.length > 0)sn += " - " + classDoc.customLabel;

	 classDoc.classname = sn;


		$("#className").empty();
		$("#className").append(classDoc.classname);
	}

	function validateClassDoc()
	{
		//validate record
		//department
		//module or modules
		if(classDoc.department == "none" || classDoc.department == undefined)
		{
			alert("You must set a value for department");
			return false;
		}

		if(isMultiple)
		{
			if(classDoc.modules.length < 0)
			{
				alert("You must add at least one module");
				return false;
			}
		}
		else
		{
			if(classDoc.module == "none" || classDoc.module == undefined)
			{
				alert("You must set a module");
				return false;
			}
		}

		return true;
	}

	function updateClassModules()
	{
		$('#classModules').empty();
		for(var i = 0; i < classModules.length; i++)
		{
			let m = "";
			if(classModules[i].code != undefined)
			{
				m +=  classModules[i].code + ", "
			}
			m += classModules[i].title;
			var row = $("<tr></tr>");
			row.append("<td>" + m + "</td>");
			row.append("<td><button class='btn btn-danger btn-sm remove' id='" + i + "'>remove</button></td>")
			$('#classModules').append(row);
		}
	}


})
