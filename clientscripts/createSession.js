
$(document).ready(function(){

	var sessionModules = [];
	var moduleList = [];

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
			moduleList = res;
			for(var i = 0; i < res.length; i++)
			{
				$('#moduleInput').append("<option value='"+ i +"'>" + res[i].code + "," + res[i].title + "</option>");
			}
		})
	});

	$("#addExisting").on("click", function(e)
	{
		//TODO check module hasn't already been added
		var m = $('#moduleInput').val();
		if(m != "none")
		{
			sessionModules.push(moduleList[m]);
			updateSessionModules(sessionModules);
		}
		else
		{
			alert("can't add none");
		}
	})

	$("#addCustom").on("click", function(e)
	{
		//TODO check module hasn't already been added
		var m = $('#newModule').val();
		if(m.length > 5)
		{
			sessionModules.push({title: m});
			updateSessionModules(sessionModules);
		}
		else
		{
			alert("Your module name must be longer than 5 characters");
		}

	})

	$("#createSession").on("click", function(e)
	{
		var sdoc = {};
		sdoc.department = $('#departmentInput').val();
		sdoc.modules = sessionModules;
		sdoc.sessionname = $('#newSession').val();
		sdoc.term = $('#termInput').val();

		//validate record
		var k = Object.keys(sdoc);

		for(var i = 0; i < k.length; i++)
		{
			if(sdoc[k[i]] == "none" || sdoc[k[i]].length == 0)
			{
				alert("You must set a value for " + k[i]);
				return;
			}
		}

		var req = $.post("/createsession",sdoc,function(res){
			//TODO move to next stage
			console.log("Yay");
		});

		req.fail(function(res){
			alert(res.responseText);
		})


	})

})

function updateSessionModules(sessionModules){
	$('#sessionModules').empty();
	for(var i = 0; i < sessionModules.length; i++)
	{
		let m = "";
		if(sessionModules[i].code != undefined){
			m +=  sessionModules[i].code + ", "
		}
		m += sessionModules[i].title;
		$('#sessionModules').append("<li>" + m + "</li>")
	}
}
