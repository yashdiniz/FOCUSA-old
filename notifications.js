/*
	This module contains the request handlers for a simple http notification module in focusa v3.0.0

	@author: yash.diniz;
*/
var ydb = new (require(__dirname + "/ydb"))();
var custom = require(__dirname + "/customAcc.js");

var config = require(__dirname+"/config.json");		//the config file for more flexibility
var bodyParser = require("body-parser");

module.exports = (app) => {

	app.use(require("cookie-parser")("focUSA"));
	app.use(bodyParser.urlencoded({extended:false}));

	//ISSUE: checkSession in notification PREVENTS logout after 5 minutes of inactivity(as user is presumed alive)... 
	//FIX: ydb.checkSession gets a new boolean NOT TO UPDATE VALIDITY, and will be active only for notifications...
	//	Therefore, notifications will no longer prevent a user from logging out due to inactivity...

	app.post("/notifyme", (req,res)=>{
		//allows a user to view his notifications
		var sdata = ydb.checkSession(req.cookies['focUSA'],true);
		if(sdata && sdata.ip == req.ip)res.send(custom.getNotifications(sdata));
	});

	app.get("/notifyme", (req,res)=>{
		//allows a user to view his notifications
		var sdata = ydb.checkSession(req.cookies['focUSA'],true);
		if(sdata && sdata.ip == req.ip)res.send(custom.getNotifications(sdata));
	});

	app.post("/clearnotif", (req,res)=>{
		//allows a user to clear a specific notification
		var sdata = ydb.checkSession(req.cookies['focUSA'],true);
		if(sdata && sdata.ip == req.ip)res.send(custom.clearNotifs(sdata,req.body.id));		//clears the notifications right after client views them
	});
}