/*
	This module contains the request handlers for topics in FOCUSA v3.0.0

	@author: yash.diniz;
*/
var ydb = new (require(__dirname + "/ydb"))();
var custom = require(__dirname + "/customAcc.js");

var config = require(__dirname+"/config.json");		//the config file for more flexibility
var bodyParser = require("body-parser");

module.exports = (app)=>{

	app.use(require("cookie-parser")("focUSA"));
	app.use(bodyParser.urlencoded({extended:false}));

	//allows a user to subscribe/unsubscribe a topic
	app.post("/toggle", (req,res)=>{
		var sdata = ydb.checkSession(req.cookies['focUSA']);
		//realIP:req.headers("X-Real-IP") is used to get the remote IP address if proxying is performed...
		ydb.logEverything("SUBTOGGLE", {session:sdata,topic:req.body.topic,realIP:req.headers["x-real-ip"]});
		if(sdata && sdata.ip==req.ip && custom.toggleFollowTopic(sdata.name , req.body.topic)) res.redirect("/topic/"+req.body.topic);
		else res.send("(Un)subscribing to the following topic failed. Kindly contact the network administrator(in this case the lab incharge)");
	});

	//allows a user to subscribe/unsubscribe a topic
	app.get("/toggle/:topic", (req,res)=>{
		var sdata = ydb.checkSession(req.cookies['focUSA']);
		ydb.logEverything("SUBTOGGLE", {session:sdata,topic:req.params.topic,realIP:req.headers["x-real-ip"]});
		if(sdata && sdata.ip==req.ip && custom.toggleFollowTopic(sdata.name , req.params.topic)) res.redirect("/topic/"+req.params.topic);
		else res.send("(Un)subscribing to the following topic failed. Kindly contact the network administrator(in this case the lab incharge)");
	});

	app.get("/topic/:topic", (req,res)=>{
		//will display a specific topic to the user
		var sdata = ydb.checkSession(req.cookies['focUSA']);
		if(custom.getTopics().indexOf(req.params.topic)>=0 && sdata && sdata.ip==req.ip)
		 res.render(__dirname+"/pages/posts.htm" , {posts:custom.searchPosts(req.params.topic),private:sdata,topic:req.params.topic,interests:custom.getInterests(sdata.name),adminMenuItem:sdata?(ydb.getUserInformation(sdata.name).login==="a"):false,query:req.params.topic});
		else res.redirect("/404");
	});

	app.get("/topic/:topic/:last", (req,res)=>{
		//will display a specific topic to the user
		var sdata = ydb.checkSession(req.cookies['focUSA']);
		if(custom.getTopics().indexOf(req.params.topic)>=0 && sdata && sdata.ip==req.ip)
		 res.render(__dirname+"/pages/posts.htm" , {posts:custom.searchPosts(req.params.topic,req.params.last),private:sdata,topic:req.params.topic,interests:custom.getInterests(sdata.name),adminMenuItem:sdata?(ydb.getUserInformation(sdata.name).login==="a"):false,query:req.params.topic});
		else res.redirect("/404");
	});
}