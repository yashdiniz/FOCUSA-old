$(function () {
	"use strict";

	// for better performance - to avoid searching in DOM
	var content = $('#content');
	var input = $('#input');
	var status = $('#status');

	var tempsess = Math.random();	//generates a random number that is used to designate this session locally

	// my name and peer name sent from the server
	var myName = false;
	var destName = false;
	var convoKey = false;	//this key is unique to every conversation...

	// if user is running mozilla then use it's built-in WebSocket
	window.WebSocket = window.WebSocket || window.MozWebSocket;

	// if browser doesn't support WebSocket, just show some notification and exit
	if (!window.WebSocket) {
		content.html($('<p>', { text: 'Sorry, but your browser doesn\'t support WebSockets. Please try running FOCUSA on another internet browser.'} ));
		alert('Sorry, but your browser doesn\'t support WebSockets. This browser cannot run FOCUSA Converse.');
		input.hide();
		return;
	}

	// open connection
	try {
		var connection = new WebSocket("ws://"+document.location.hostname+"/msg");
		//catch will be initiated if above connection fails due to SecurityError
	} catch(e) {
		var connection = new WebSocket("wss://"+document.location.hostname+"/msg");
	}

	connection.onopen = function () {
		// first we want users to enter their names
		input.removeAttr('disabled');
		input.removeAttr('disabled').focus();
		input.attr('placeholder','Type your message');
	};

	connection.onerror = function (error) {
		// just if there were some problems with connection...
		content.html($('<p>', { text: 'Sorry, but there\'s some problem with your '
									+ 'connection or the server is down. Trying again.' } ));
		// reinitialize connection
		connection = new WebSocket("ws://"+document.location.hostname+":1811");
		//remember this connection will not be secure, and assume proxy has failed
	};

	// most important part - incoming messages
	connection.onmessage = function (message) {
		// try to parse JSON message. Because we know that the server always returns
		// JSON this should work without any problem but we should make sure that
		// the massage is not chunked or otherwise damaged.
		try {
			var json = JSON.parse(message.data);
		} catch (e) {
			console.log('This doesn\'t look like a valid JSON: ', message.data);
			return;
		}

		// NOTE: if you're not sure about the JSON structure
		// check the server source code above
		if (json.type === 'name') { // first response from the server with user's name
			myName = json.you;
			destName = json.dest;
			convoKey = json.key;
			input.removeAttr('disabled').focus();
			status.text("User "+myName+" connected to "+destName);
			// from now user can start sending messages
		} else if (json.type === 'history') { // entire message history
			// insert every single message to the chat window
			for (var i=0; i < json.data.length; i++) {
				addMessage(json.data[i].author, json.data[i].text, new Date(json.data[i].time));
			}
		} else if (json.type === 'message') { // it's a single message
			input.removeAttr('disabled'); // let the user write another message
			if(json.data.author !== myName && !document.hasFocus()) {	//prevents notifications of self-sent messages, and also does not notify if user has window open...
				var n = new Notification("FOCUSA message from "+json.data.author, {body:json.data.text, icon:'/public/icon.ico', tag:tempsess, requireInteration:true});		
				n.onclick = function(event) {
					event.preventDefault();
					window.open("#","_self");
					n.close();
				}
				n.onclose = function(event) {
					event.preventDefault();
					n.close();
				}	
			}
			addMessage(json.data.author, json.data.text, new Date(json.data.time));
		} else if (json.type === 'conn') {
			var state = json.state?"connected":"disconnected";
			content.prepend('<p><span style="color:red">' + json.user + ' has ' + state + '.</span>')
		} else {
			console.log('Hmm..., I\'ve never seen JSON like this: ', json);
		}
	};

	/**
	 * Send mesage when user presses Enter key
	 */
	input.keydown(function(e) {
		if (e.keyCode === 13) {
			var msg = JSON.stringify({message:$(this).val().trim() , dest:destName , source:myName , key:convoKey});
			if (!msg && $(this).val().trim()) {
				return;
			}
			// send the message as an ordinary text
			connection.send(msg);
			$(this).val('');
			// disable the input field to make the user wait until server
			// sends back response
			//input.attr('disabled', 'disabled');
			// we know that the first message sent from a user is their name
			if (myName === false) {
				myName = msg;
			}
		}
	});

	/**
	 * This method is optional. If the server wasn't able to respond to the
	 * in 3 seconds then show some error message to notify the user that
	 * something is wrong.
	 */
	setInterval(function() {
		if (connection.readyState !== 1) {
			status.text('Error: ' + 'Connecting...');
			input.attr('disabled', 'disabled').val('Trying to connect '
												 + 'with the Server.');
		}
	}, 3000);

	/**
	 * Add message to the chat window
	 */
		 
	if(!("Notification" in window)){
		if(!localStorage.getItem("notifalert"))alert("This browser does not support notifications. Please update your browser, or make use of a supported browser to have a great experience on FOCUSA.");
		localStorage.setItem("notifalert",true);
	}else if(Notification.permission!="granted") {
		Notification.requestPermission((d)=>{
			if(d==="granted"){
				console.log("Notifications have begun...");
			}
		});
	} else console.log("Notifications have begun...");

	function addMessage(author, message, dt) {
		/*var msg = '<tr style=\"width:100%\"> ';
		if(author!==myName) {
			msg += '<td style=\"width:100%\">';
			msg += '<div id=\"#bubble\" title=\"'+dt.toDateString()+'\" style=\"width:100%;text-align:left;\"><span style=\"color:' + color + '\">' + author + '</span> @ ' +
			+ (dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) + ':'
			+ (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes())
			+ ':<br>' + message + '</div></td><td></td></tr>';
		}
		else {
			msg += '<td style=\"width:100%\">&nbsp;</td><td style=\"width:100%\">';
			msg += '<div id=\"#bubble\" title=\"'+dt.toDateString()+'\" style=\"text-align:left;\"><span style=\"color:' + color + '\">' + author + '</span> @ ' +
			+ (dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) + ':'
			+ (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes())
			+ ':<br>' + message + '</div></td></tr>';
		}
		content.prepend(msg);*/
		var row = $("<tr>").css({width:'100%'});
		var cell1 = $("<td>").css({width:'50%'});
		var cell2 = $("<td>").css({width:'50%'});
		row.append(cell1).append(cell2);

		var time = $("<span>").css({float:'right',bottom:'0px'}).addClass('mui--text-caption').text(
			(dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) + ':'	+ (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes()));

		var messagebox = $("<div>").addClass("mui-panel").attr("title",dt.toDateString()).css({'text-align':'left','background-color':(author===myName)?'#beeffa':'white'})
						.html('<span style=\"color:blue;\">' + author + '</span> '
						+ ':<br>' + message);
		messagebox.append(time);

		(author!==myName)?cell1.append(messagebox):cell2.append(messagebox);
		content.append(row);
	}
});