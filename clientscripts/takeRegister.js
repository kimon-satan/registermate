$(document).ready(function()
{
	var classDoc;

	//close both panels
	$("#openPanel").addClass("hidden");
	$("#closePanel").addClass("hidden");
	$("#closeDiv").addClass("hidden");

	//Load the user's classes
	var req = $.get("userclasses", function(res){

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

			if(!classDoc.classpass)
			{
				setHTMLClosed();
			}
			else
			{
				setHTMLOpen();
			}

			//TODO load the students & update the table

		})
		req.fail(function(err){
			alert(err);
		});

	});

	function setHTMLClosed()
	{
		$("#openPanel").addClass("hidden");
		$("#closePanel").removeClass("hidden");
	}

	function setHTMLOpen()
	{
		$("#closePanel").addClass("hidden");
		$("#openPanel").removeClass("hidden");
	}


})
