var Logdata;	//stores the logs when requested.,,
var called = false;		//stores the boolean when logData request initiates...
function addUser(username, password, permission) {
	//used to add a user to the FOCUSA database
	if(!username && !password && !permission) {
		//welcome to the addUser easter egg!!(Spoiler)
		console.log("Welcome to the addUser Easter Egg in FOCUSA!");
			var modal = document.createElement("div");
			modal.className = "mui-panel";
			$(modal).css({padding:"20px" , "max-width":"500px" , margin:"100px auto" , transition:".5s ease"});
			var form = document.createElement("form");
			form.action = "/csv" , form.method = "post" , form.enctype = "multipart/form-data" , form.className = "mui-form";
			$(form).html("<p>Welcome to FOCUSA's easter egg! This feature allows you to upload a CSV(comma-delimited) file containing the names of the users you wish to add to FOCUSA.</p> \
				<p>After uploading the CSV, FOCUSA will start adding all the users described in the file to FOCUSA, which is actually MUCH easier than writing commands or manually typing the names!</p> \
				<p>Format of CSV: Each row should have the tuple: @username, password, permission<br> \
				Example: @admin, gyroscope, a 	(remember the '@' for the username)</p>\
				<b>Choose the file:</b> \
				<center> \
				<input type='hidden' name='query' value='adduser'> \
				<div class='mui-textfield'> \
				<input type='file' name='csv' accept='text/csv' style='font-size:12px; width:70%;'> \
				</div> \
				</center> \
				<div style='height:20px;'></div> \
				<div style='text-align:right;'> \
				<button type='submit' class='mui-btn mui-btn--primary'>Upload</button> \
				</div>");
			modal.appendChild(form);
			mui.overlay('on',modal);
	} else setTimeout(function() {
	$.post("/dashboard", {query:"adduser", username:username, password:password, permission:permission} ,function(data,status) {
		console.log(data);
	});
	}, 100);
}

function updateUser(username, newpassword, newpermission) {
	//used to update a user's current credentials in the FOCUSA database
	//password can be empty, but permission and username cannot
	if(!username && !newpassword && !newpermission) {
		//welcome to the addUser easter egg!!(Spoiler)
		console.log("Welcome to the updateUser Easter Egg in FOCUSA!");
			var modal = document.createElement("div");
			modal.className = "mui-panel";
			$(modal).css({padding:"20px" , "max-width":"500px" , margin:"100px auto" , transition:".5s ease"});
			var form = document.createElement("form");
			form.action = "/csv" , form.method = "post" , form.enctype = "multipart/form-data" , form.className = "mui-form";
			$(form).html("<p>Welcome to FOCUSA's easter egg! This feature allows you to upload a CSV(comma-delimited) file containing the names of the users you wish to update the details of.</p> \
				<p>After uploading the CSV, FOCUSA will start updating all the users described in the file, which is actually MUCH easier than writing commands or manually typing the names!</p> \
				<p>Format of CSV: Each row should have the tuple: @username, new password, new permission<br> \
				Example: @admin, gyroscope2, a 	(remember the '@' for the username)</p>\
				<b>Choose the file:</b> \
				<center> \
				<input type='hidden' name='query' value='upduser'> \
				<div class='mui-textfield'> \
				<input type='file' name='csv' accept='text/csv' style='font-size:12px; width:70%;'> \
				</div> \
				</center> \
				<div style='height:20px;'></div> \
				<div style='text-align:right;'> \
				<button type='submit' class='mui-btn mui-btn--primary'>Upload</button> \
				</div>");
			modal.appendChild(form);
			mui.overlay('on',modal);
	} else
	setTimeout(function(){$.post("/dashboard", {query:"upduser", username:username, newpassword:newpassword, newpermission:newpermission} ,function(data,status) {
		console.log(data);
	});
	}, 100);
}

function deleteUser(username) {
	//used to delete a user from the FOCUSA database
	setTimeout(function(){$.post("/dashboard", {query:"deluser", username:username} ,function(data,status) {
		console.log(data);
	});
	}, 100);
}

function getUserInformation(username) {
	//used to delete a user from the FOCUSA database
	setTimeout(function(){$.post("/dashboard", {query:"getuser", username:username} ,function(data,status) {
		console.log(data);
	});
	}, 100);
}

function showLogs() {
	if(called) return false;
	called = true;
	console.log("Started download, Please wait...");
	$.post("/dashboard", {query:"getlogs"}, function (data, status) {
		Logdata = data;
		console.log("Finished download... Data available in Logdata variable.");
	});
	//location.assign("/dashboard/logs");
}
function searchLogs(query) {
	var j = [];
	if(!called) {
		showLogs();
		console.log("Please try the command again...");
	} else {
		for(var k in Logdata) if(JSON.stringify(Logdata[k]).match(query)) j.push(Logdata[k]);
		return j;	
	}
}
function createTopic(topic) {
	// allows admins to create a topic(a category to post under)
	setTimeout(function() { $.post("/dashboard", {query:"createTopic" , topic:topic}, function(data,status) {
		console.log(data);
	});
	}, 100);
}
function removeTopic(topic) {
	// allows admins to remove a topic(a category to post under) previously created...
	setTimeout(function() { $.post("/dashboard", {query:"removeTopic" , topic:topic}, function(data,status) {
		console.log(data);
	});
	}, 100);
}
function notifyUser(username, label, data, link) {
	// Send a notification to any user...
	setTimeout(function() { $.post("/dashboard", {query:"notification" , username:username , label:label , data:data , link:link}, function(data,status) {
		console.log(data);
	});
	}, 100);
}
function deleteMessages(from,to) {
	// Delete the messages of a conversation between two admin users...
	setTimeout(function() { $.post("/dashboard", {query:"deleteMsgs" , from:from , to:to}, function(data,status) {
		console.log(data);
	});
	}, 100);
}
function logout() {
	location.assign("/logout");
}
