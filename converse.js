/*
	This module contains the request handlers for a simple chat module in focusa v3.0.0

	@author: Relino Carvalho;
	Integrated by: Yash Diniz;
*/

var ydb = new (require(__dirname + "/ydb"))();
var custom = require(__dirname + "/customAcc.js");

var config = require(__dirname+"/config.json");     //the config file for more flexibility
var bodyParser = require("body-parser");
var WebSocket = require('websocket').server;

var clients = [];	//will store the sockets of all clients
var convoKeys = {};	//dictionary of all initiated chats, with UUID and recipient...
//convoKeys is used to maintain sessions while upgrading from HTTP to webSocket.
//It uses cookies to transfer the information about the conversation to begin.

function htmlEntities(str) {
	// Quick and simple function to escape HTML strings...
	return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getSessCookie(key,cookieArray) {
	// Since webSocket gives an array of cookies, here the correct cookie is searched...
	var filtered = cookieArray.filter((obj)=> {
         return obj.name == key;
     });
     return filtered.length > 0 ? filtered[0].value : null;
}

module.exports = (app, http) =>{
	console.log("Server initiated. Also listening to websocket connections over HTTP interface.");
	var ws = new WebSocket({
		//http://tools.ietf.org/html/rfc6455#page-6
		//RFC 6455 mandates that WebSockets run through HTTP tunnels
		//NOTE: When FOCUSA server.js runs, the https instance is sent over the http variable if https allowed
		httpServer: http
	});

	app.use(require("cookie-parser")("focUSA"));
	app.use(bodyParser.urlencoded({extended:false}));

	app.get("/chat/:user", (req,res)=>{
		//supports peer-to-peer chat...
		var sdata = ydb.checkSession(req.cookies['focUSA']);
		var sessUser = ydb.getUserInformation(sdata.name);
		//if user is admin, and logged in...
		if(sdata && sdata.ip == req.ip && sdata.name!=req.params.user && sessUser && sessUser.login === "a" && ydb.getUserInformation(req.params.user) && ydb.getUserInformation(req.params.user).login === "a") {
			var details = [sdata.name , req.params.user];
			details.sort((a,b)=>{ return a>=b });	//sort the user names so that a common conversation tuple between both parties can be generated...
			//Since it is sorted, the same hash is bound to be generated between both parties
			var convoSess = ydb.encrypt(details.toString());	//each conversation shall have a conversation ID...
			convoKeys[convoSess] = details;	//caches the names of both parties of conversation under a single variable...
			res.cookie("convoSess" , convoSess , { maxAge: 1000 * 6 , httpOnly:true } );		//a cookie for 6 seconds
			res.sendFile(__dirname+"/pages/chat.htm");
		} else if(sdata.name===req.params.user) {
			res.send("Are you trying to start a conversation with yourself?");
		} else if(sdata && sdata.ip == req.ip && sessUser && sessUser.login === "a") {
			res.send("This user is not eligible to receive messages.(The user is not an admin).");
		} else res.redirect("/403");
	});

	// This callback function is called every time someone
	// tries to connect to the WebSocket server
	ws.on('request', (req)=>{
		var sdata = ydb.checkSession(getSessCookie("focUSA", req.cookies));
		if(!sdata || (sdata && ydb.getUserInformation(sdata.name).login !== "a")) {
			// if not logged in, or if not admin, the user connection gets rejected...
			req.reject(null,req.origin);
			console.log((new Date()) + " Connection rejected.");
			ydb.logEverything("CHAT", {origin:req.origin, session:sdata});
			return;
		}
		// connection gets accepted otherwise...
		var connection = req.accept(null,req.origin);
		var uname = sdata?sdata.name:false;	//username
		var sess = getSessCookie("convoSess",req.cookies);
		var cdata = convoKeys[sess];	//the conversation details
		var dest = (cdata&&cdata.indexOf(uname)>=0)?cdata.filter((a)=>{return a!=uname;}).toString():false;	//get details of other party
		//the destination of the conversation is saved in the convoSess variable...
		//we need index to remove user connection on 'close' event
		var index = clients.push({connection:connection, uname:uname, dest:dest, key:sess}) - 1;
		if(!dest) {
			connection.close();	//If conversation doesn't exist, the connection is closed immediately...
			return;
		}

		//TODO: create a user message database through Reference(), which allows users to store the messages, and retrieve them, based on messages for and from user...
		//store as username, and for p2p messages, save the message with metadata in destination history. These messages are used as history...
		//For now, only keep peer to peer

		connection.sendUTF(JSON.stringify({type:"name",you:uname,dest:dest,key:sess}));
		//sends the usernames to client, now session key is unnecessary(because socket is stateful)...

		// send chat history
		if (custom.readMessages(uname,dest).length > 0) {
			connection.sendUTF(JSON.stringify( {type: 'history', data: custom.readMessages(uname,dest)} ));
		}

		//if a connected socket sends a message...
		connection.on('message', (message)=>{
			// prevents attacker from sending blob entry
			if(message.type === 'utf8') {
				if(uname === false) {
					connection.close();
					return;
				}
				try {
					var msg = JSON.parse(message.utf8Data);
				} catch(e) {
					ydb.logEverything("CHAT", {desc:"Bad data type sent to server", msg:message.utf8Data, session:sdata});
					return;
				}
				var obj = {
					time: Date.now(),
					text: htmlEntities(msg.message),
					author:uname
				}
				var json = JSON.stringify({type:"message", data: obj});
				ydb.checkSession(sess);		//just updates the session duration so that user does not get logged out...
				c=0;	//counter stores number of clients message has been forwarded to...
				if(htmlEntities(msg.message).trim()) {
					custom.saveMessage(uname,dest,obj);
					clients.forEach((client)=>{
						if((msg.dest === client.uname || msg.source === client.uname) && msg.key === client.key) {
							client.connection.sendUTF(json);
							c++;
						}
					});
				}
				if(c<2)custom.notifyUser(dest, "FOCUSA message from "+uname, "Click to read messages", "/chat/"+uname, uname);
			}
		});

		//if a connection is closed...
		connection.on('close', (connection)=>{
			if(uname !== false) {
				delete convoKeys[sess];		//after job is done, delete that instance, so that there is room for more...
				clients.splice(index,1);
			}
		});
	});
}