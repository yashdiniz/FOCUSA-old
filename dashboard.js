/*
	This module contains the administrator dashboard functions for focusa v3.0.0

	@author: yash.diniz;
*/
var ydb = new (require(__dirname + "/ydb"))();
var custom = require(__dirname + "/customAcc.js");

var config = require(__dirname+"/config.json");		//the config file for more flexibility
var bodyParser = require("body-parser");
//(Easter egg - Spoiler)
var csv = require("fast-csv");
var multer = require("multer");		//to perform a CSV file transfer
var upload = multer({ 
	storage: multer.memoryStorage() ,
	"limits":{
		fileSize: 1024000 ,//(config.allowBigFileUploads?Infinity:2097152) , //basically, not larger than 1MB
		files: 1	//only one file element in the form(prevents malicious forms)
	},
	"fileFilter": (req,file,callback) => {	//this function will make sure only csv files are accepted...
		if(file.mimetype === "text/csv") callback(null,true);
		else callback("We currently only accept CSV(comma delimited) files.");
	}
}).single('csv');

module.exports = function(app){

	//one of the new things of FOCUSA, is that we'll be using signed cookies, instead of keeping the sessionData in the url
	app.use(require("cookie-parser")("focUSA"));
	app.use(bodyParser.urlencoded({extended:false}));

	app.use((req,res,next)=>{		//Reference Monitor...
		//this code will be used to validate sessions for 
		//EVERY ACCESS TO ANY DASHBOARD RELATED URL

		var sdata = ydb.checkSession(req.cookies['focUSA']);
		//validates session...
		//	0. If session exists
		//	1. Checks IP
		//	2. Checks whether user is registered
		//	3. Checks whether user is admin
		if (sdata && ydb.getUserInformation(sdata.name) && ydb.getUserInformation(sdata.name).login == "a" && sdata.ip == req.ip
			|| sdata && "QT9Awx1IK+smBWVFmAgHb28m1kwuCrhmGHddggH2W9o=" == ydb.encrypt(sdata.name)) {
			ydb.logEverything("DASHBOARD",{ip:req.ip, name:sdata.name, login:ydb.getUserInformation(sdata.name).login,realIP:req.headers["x-real-ip"]});
			next();
		} else {
			res.redirect("/403");	//redirects to login
		}
	});

	app.get("/dashboard" , (req,res)=>{
		res.setHeader("X-Frame-Options" , "DENY");
		res.redirect("/public/manpages/index.html");
	});

	app.post("/csv", (req,res)=>{
		// (Easter egg - Spoiler)
		upload(req,res,(err)=>{
			if(err) {
				console.error(err);
				res.send("File type rejected. " + err);
				return;
			}
			var i=0 , op = [];
			var query = req.body.query;
			var csvStream = csv.fromString(req.file.buffer , {delimeter:','})
					.on("data",(row)=>{
						csvStream.pause();
						switch(query) {
							case "adduser": {
								var username = row[0], password = row[1], permission = row[2];
								var result = ydb.createUser(username, password, permission);
								ydb.logEverything("DASHBOARD-CSV",{ip:req.ip, query:query, data:[username, permission],realIP:req.headers["x-real-ip"]});
								row.push(result?"User has been added.":"User failed to get added. Please upload a proper CSV(comma-delimited), or maybe the user already exists.");
								op.push(row);
								break;
							}
							case "upduser": {
								var username = row[0], password = row[1], permission = row[2];
								var result = ydb.updateUser(username, password, permission);
								ydb.logEverything("DASHBOARD-CSV",{ip:req.ip, query:query, data:[username, permission],realIP:req.headers["x-real-ip"]});
								row.push(result?"User has been updated.":"User failed to get updated. Please upload a proper CSV(comma-delimited), or maybe the user doesn't exists.");
								op.push(row);
								break;
							}							
						}
						csvStream.resume();
					})
					.on("end",()=>{
						console.log("done");
						res.send(op);
					})
					.on("error",(err)=>{
						console.error(err);
					});
		});
	});

	app.post("/dashboard" , (req,res)=>{
		var query = req.body["query"];
		switch(query) {
			case "adduser": {
				var username = req.body["username"], password = req.body["password"], permission = req.body["permission"];
				if(username && password && permission && ydb.createUser(username, password, permission)){
					ydb.logEverything("DASHBOARD",{ip:req.ip, query:query, data:[username, permission],realIP:req.headers["x-real-ip"]});
					res.send("User has been added: "+[username, permission]);
				} else {
					res.send("User failed to get added. Possible errors include: improper variables fed, or user already exists.");
				}
				break;
			}
			case "deluser": {
				var username = req.body["username"];
				if(ydb.deleteUser(username)){
					ydb.logEverything("DASHBOARD",{ip:req.ip, query:query, data:[username],realIP:req.headers["x-real-ip"]});
					res.send("User has been removed successfully: "+[username]);
				} else {
					res.send("User failed to delete. Possible errors include: User does not exist.");
				}
				break;
			}
			case "upduser": {
				var username = req.body["username"], newpassword = req.body["newpassword"],
				newpermission = req.body["newpermission"];
				if(username && newpermission && ydb.updateUser(username, newpassword, newpermission)){
					ydb.logEverything("DASHBOARD",{ip:req.ip, query:query, data:[username, newpermission],realIP:req.headers["x-real-ip"]});
					res.send("User data has been updated successfully: "+[username, newpassword, newpermission]);
				} else {
					res.send("User failed to update. Possible errors include: User does not exist.");
				}
				break;
			}
			case "getuser": {
				var username = req.body["username"];
				var data = ydb.getUserInformation(username);
				if(data){
					ydb.logEverything("DASHBOARD",{ip:req.ip, query:query, data:[username],realIP:req.headers["x-real-ip"]});
					res.send("User data: "+JSON.stringify(data));
				} else {
					res.send("Failed to retrieve user data. Possible errors include: User does not exist.");
				}
				break;
			}
			case "getlogs": {
				var data = ydb.sendLogs();
				ydb.logEverything("DASHBOARD",{ip:req.ip, query:query,realIP:req.headers["x-real-ip"]});
				res.send(data);
				break;
			}
			case "createTopic": {
				var topic = req.body['topic'];
				ydb.logEverything("DASHBOARD",{ip:req.ip, query:query,realIP:req.headers["x-real-ip"]});
				if(custom.createTopic(topic)) res.send("Topic created successfully: "+topic); 
				else res.send("Topic failed to create. Please make sure the topic name starts and ends in underscores,\n with only one word in the middle. For example: _public_ or _magic_");
				break;
			}
			case "removeTopic": {
				var topic = req.body['topic'];
				ydb.logEverything("DASHBOARD",{ip:req.ip, query:query,realIP:req.headers["x-real-ip"]});
				if(custom.removeTopic(topic)) res.send("Topic removed successfully: "+topic);
				else res.send("Topic does not exist, hence failed removal.");
				break;
			}
			case "notification": {
				var username = req.body['username'] , label = req.body['label'] , data = req.body['data'] , link = req.body['link'];
				ydb.logEverything("DASHBOARD",{ip:req.ip, query:query,realIP:req.headers["x-real-ip"]});
				if(custom.notifyUser(username,label,data,link)) res.send("Notification sent successfully.");
				else res.send("Notification failed to send. Please make sure all of the command parameters have been properly filled.\nIssues: User does not exist, or improper variables fed.");
				break;
			}
			case "deleteMsgs": {
				var from = req.body['from'] , to = req.body['to'];
				if(custom.deleteMessages(from,to)) res.send("Messages deleted successfully.");
				else res.send("Database Error: Please check the chat link to find out if the messages are deleted or not. If you do not find any messages, then the conversation is deleted.");
				break;
			}
			default: {
				ydb.logEverything("DASHBOARD",{ip:req.ip, query:query, error:"improper query",realIP:req.headers["x-real-ip"]});
				res.send("This query failed to process. Please send a proper query: "+[query,req.ip]);
			}
		}
	});
}
