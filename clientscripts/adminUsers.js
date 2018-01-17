var counter = 0;

$(document).ready(function()
{
	updateTable({idx: counter, items: 50});

	$('#showmore').on("click", function(e){
		updateTable({idx: counter, items: 50});
	})

	//NB. this syntax accounts for dynamically added elements
	$(document).on("click",'.role',function(e)
	{
		var _id = e.target.parentElement.parentElement.id;
		$.post(server_url +"/changerole", {_id: _id}, function(res)
		{
			console.log(res);
			updateRow(_id);
		})
		.fail(function(res){
			alert(res.responseText);
		})
	})

	$(document).on("click",'.remove', function(e)
	{

		var _id = e.target.parentElement.parentElement.id;
		var un = $('#' + _id +' > .username').text();
		var c = confirm("Are you sure you want to remove " + un + " ?");
		if(c)
		{
			$.post(server_url + "/removeuser", {_id: _id}, function(res)
			{
				console.log(res, _id);
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
	$.get(server_url + "/userdata", filter ,function(data){

		counter += data.length;

		for(var i = 0; i < data.length; i++)
		{
			var row = $("<tr id='" + data[i]._id + "'></tr>");
			row.append("<td class='username'>" + data[i].username + "</td>");
			row.append("<td class='firstname'>" + data[i].firstname + "</td>");
			row.append("<td class='surname'>" + data[i].surname + "</td>");
			row.append("<td class='email'>" + data[i].email + "</td>");
			row.append("<td class='role'>" + data[i].role + "</td>");
			var col = $("<td></td>");
			col.append("<button class='btn btn-warning hspaced role'>change role</button>");
			col.append("<button class='btn btn-danger hspaced remove'>remove user</button>");
			row.append(col);
			$('#usertable').append(row);
		}

		if(data.length < 50)
		{
			$('#showmore').hide();
		}

	})

}

function updateRow(_id)
{
	$.get("/userdata", {_id: _id} ,function(data)
	{
		if(data.length > 0)
		{
			var row = $('#' + _id);
			row.empty();
			row.append("<td class='username'>" + data[0].username + "</td>");
			row.append("<td class='firstname'>" + data[0].firstname + "</td>");
			row.append("<td class='surname'>" + data[0].surname + "</td>");
			row.append("<td class='email'>" + data[0].email + "</td>");
			row.append("<td class='role'>" + data[0].role + "</td>");
			var col = $("<td></td>");
			col.append("<button class='btn btn-warning hspaced role'>change role</button>");
			col.append("<button class='btn btn-danger hspaced remove'>remove user</button>");
			row.append(col);
		}

	})

	.fail(function(res){
		alert(res.responseText);
	})

}
