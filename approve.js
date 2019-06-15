/*
	This module contains the request handlers for the approve post module in focusa v3.0.0

	@author: yash.diniz;
*/

var ydb = new (require(__dirname + "/ydb"))();
var custom = require(__dirname + "/customAcc.js");

var config = require(__dirname + "/config.json");		//the config file for more flexibility
var bodyParser = require("body-parser");

module.exports = (app) => {

	app.use(require("cookie-parser")("focUSA"));
	app.use(bodyParser.urlencoded({extended:false}));

	app.get("/approve", (req,res)=>{
		//allows a user to view his notifications
		var sdata = ydb.checkSession(req.cookies['focUSA']);
		ydb.logEverything("SEARCH",{query:["approve"],session:sdata,realIP:req.headers["x-real-ip"]});
		if(sdata && sdata.ip == req.ip && ydb.getUserInformation(sdata.name).login == "a") {
			res.render(__dirname+"/pages/posts.htm" , {posts:custom.viewApprovalPosts(),query:"",private:sdata,adminMenuItem:sdata?(ydb.getUserInformation(sdata.name).login==="a"):false,interests:false});
		}
		else res.redirect("/403");
	});

	app.get("/approve/:last", (req,res)=>{
		//allows a user to view his notifications
		var sdata = ydb.checkSession(req.cookies['focUSA']);
		ydb.logEverything("SEARCH",{query:["approve",req.params.last],session:sdata,realIP:req.headers["x-real-ip"]});
		if(sdata && sdata.ip == req.ip && ydb.getUserInformation(sdata.name).login == "a") {
			res.render(__dirname+"/pages/posts.htm" , {posts:custom.viewApprovalPosts(req.params.last),query:"",private:sdata,adminMenuItem:sdata?(ydb.getUserInformation(sdata.name).login==="a"):false,interests:false});
		}
		else res.redirect("/403");
	});


	app.get("/approve/positive/:id", (req,res)=>{
		//allows a user to view his notifications
		var sdata = ydb.checkSession(req.cookies['focUSA']);
		if(sdata && sdata.ip == req.ip && custom.approvePost(req.params.id,sdata,req.headers)) res.redirect("back");
		else res.redirect("/403");
	});
}