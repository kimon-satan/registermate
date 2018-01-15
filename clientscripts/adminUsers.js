
$(document).ready(function()
{
	$.get("/userdata",function(data){

		console.log(data);

		for(var i = 0; i < data.length; i++)
		{
			var row = $("<tr id='" + data[i].username + "'></tr>");
			row.append("<td>" + data[i].username + "</td>");
			row.append("<td>" + data[i].firstname + "</td>");
			row.append("<td>" + data[i].surname + "</td>");
			row.append("<td>" + data[i].email + "</td>");
			row.append("<td>" + data[i].role + "</td>");
			row.append("<td></td>");
			$('#usertable').append(row);
		}
	})
	.fail(function(res){
		alert(res.responseText);
	})

});
