var counter = 0;

$(document).ready(function()
{
	updateTable({idx: counter, items: 50});

	$('#showmore').on("click", function(e){
		updateTable({idx: counter, items: 50});
	})

	$(document).on("click",'.edit', function(e)
	{

		var _id = e.target.parentElement.parentElement.id;

		$.get(server_url + "/editclass", {_id: _id}, function(res)
		{
			document.write(res);
		});

	})



});

function updateTable(filter)
{
	$.get(server_url + "/classdata", filter ,function(data){

		counter += data.length;

		console.log(data);

		for(var i = 0; i < data.length; i++)
		{
			var row = $("<tr id='" + data[i]._id + "'></tr>");
			row.append("<td class='classname'>" + data[i].classname + "</td>");

			var str = "";
			if(data[i].module != undefined)
			{
				str = data[i].module.code;
			}
			else
			{
				for(var j = 0; j <  data[i].modules.length; j++)
				{
					str += data[i].modules[j].code;
					if(j < data[i].modules.length -1)str += ",";
				}
			}

			row.append("<td class='modules'>" + str + "</td>");

			str = "";
			for(var j = 0; j <  data[i].teachers.length; j++)
			{
				str += data[i].teachers[j].username;
				if(j < data[i].teachers.length -1)str += ",";
			}

			row.append("<td class='teachers'>" + str + "</td>");

			str = "";


			for(var j = 0; j <  data[i].sessionarray.length; j++)
			{
				if(data[i].sessionarray[j] == "U")
				{
					str += "U";
				}
				else
				{
					let d = new Date(Number(data[i].sessionarray[j]));
					str += (d.getMonth() +1) + "/" + d.getDate() + "/" + d.getFullYear();
				}
				if(j < data[i].sessionarray.length -1)str += ",";
			}

			row.append("<td class='sessionarray'>" + str + "</td>");


			var col = $("<td></td>");
			col.append("<button class='btn btn-danger btn-xs hspaced edit'>edit class</button>");

			row.append(col);
			$('#usertable').append(row);
		}

		if(data.length < 50)
		{
			$('#showmore').hide();
		}

	})


}
