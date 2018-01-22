var counter = 0;

$(document).ready(function()
{
	updateTable({idx: counter, items: 50});

	$('#showmore').on("click", function(e){
		updateTable({idx: counter, items: 50});
	})


	$(document).on("click",'.remove', function(e)
	{

		var _id = e.target.parentElement.parentElement.id;
		var un = $('#' + _id +' > .username').text();
		var c = confirm("Are you sure you want to remove " + un + " ?");
		if(c)
		{
			$.post(server_url + "/removestudent", {_id: _id}, function(res)
			{
				$('#' + _id).remove();
			})
			.fail(function(res){
				alert(res.responseText);
			})
		}
	})


});

function updateTable(filter)
{
	$.get(server_url + "/studentdata", filter ,function(data){

		counter += data.length;

		for(var i = 0; i < data.length; i++)
		{
			var row = $("<tr id='" + data[i]._id + "'></tr>");
			row.append("<td class='username'>" + data[i].username + "</td>");
			row.append("<td class='firstname'>" + data[i].firstname + "</td>");
			row.append("<td class='surname'>" + data[i].surname + "</td>");
			var str = ""
			for(var j = 0; j <  data[i].departments.length; j++)
			{
				str += data[i].departments[j];
				if(i < data[i].departments.length -1) str += ", ";
			}
			row.append("<td class='departments'>" + str + "</td>");

			var col = $("<td></td>");
			col.append("<button class='btn btn-danger btn-xs hspaced remove'>remove user</button>");
			row.append(col);
			$('#usertable').append(row);
		}

		if(data.length < 50)
		{
			$('#showmore').hide();
		}

	})

}
