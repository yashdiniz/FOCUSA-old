/*
	This module contains the request handlers for posts for FOCUSA v3.0.0

	@author: yash.diniz;
*/
var ydb = new (require(__dirname + "/ydb"))();
var custom = require(__dirname + "/customAcc.js");

var config = require(__dirname+"/config.json");		//the config file for more flexibility
var bodyParser = require("body-parser");
var multer=require("multer");

var upload = 
multer({
	"storage":multer.diskStorage({
				destination: function (req, file, callback) {
					callback(null, __dirname+"/docs/public/documents/");
				},
				filename: function (req, file, callback) {
					var filename = Date.now() + "-" + file.originalname;
					callback(null, filename);
				}
	}),
	"limits":{
		fileSize: (config.allowBigFileUploads?Infinity:(typeof config.maxFileSizeinBytes === 'number')?config.maxFileSizeinBytes:10485760) ,	//not greater than 10MB
		files: 1	//only one file element in the form(prevents malicious forms) 
	}
});		//this variable decodes the file uploaded, from the request data (basically acts as middleware)

module.exports = (app) => {

	app.use(require("cookie-parser")("focUSA"));
	app.use(bodyParser.urlencoded({extended:false}));

	//posting is a feature that allows users to post stuff over 
	app.get("/post" , (req,res)=>{
		var sdata = ydb.checkSession(req.cookies['focUSA']);
		if(sdata && sdata.ip == req.ip) res.render(__dirname+"/pages/postform.htm" , {config:config , data: [] , topics: custom.getTopics() , uname:sdata.name , edit:false , error:false});
		else res.redirect("/403");
	});

	var fileHandle = upload.single('File');
	app.post("/post" , (req,res)=>{
		fileHandle(req,res,function(err){
			if(err){
				res.send("Attempted to upload a huge file: The network administrator has not allowed uploading of files this large. Please contact Network administrator for more information.");
				return;
			}	
			var sdata = ydb.checkSession(req.cookies['focUSA']);
			var data = req.body.description,	//the body of the post
			topic = custom.getTopics().includes(req.body.topic)?req.body.topic:"default"; //if topic doesn't exist, keep default
			if(sdata && (sdata.ip == req.ip && config.guestsCanPost?true:ydb.getUserInformation(sdata.name).login!="g")) {
				//if guests can post, then return true, otherwise only allow users who are NOT guests
				//var timestring = req.body.year+"-"+req.body.month+"-"+req.body.day;	
				var timestring = req.body.ts;	//scheduling posts...
				if((req.file||data) && custom.savePost(sdata,req.headers,req.file,data,topic,timestring)) res.redirect("/posts/search/"+sdata.name);
				else res.render(__dirname+"/pages/postform.htm" , {config:config , data: [], topics: custom.getTopics() , uname:sdata.name , edit:false , error:true});
			} else res.redirect("/403");
		});
	});

	app.get("/posts/search/:query" , (req,res)=>{
		var sdata = ydb.checkSession(req.cookies['focUSA']);
		res.render(__dirname+"/pages/posts.htm" , {config:config , posts:custom.searchPosts(req.params.query),query:escape(req.params.query),private:sdata,adminMenuItem:sdata?(ydb.getUserInformation(sdata.name).login==="a"):false,interests:false});
		ydb.logEverything("SEARCH",{query:[req.params.query,req.params.last],session:sdata,realIP:req.headers["x-real-ip"]});
	});

	app.get("/posts/search/:query/:last" , (req,res)=>{	
		var sdata = ydb.checkSession(req.cookies['focUSA']);
		res.render(__dirname+"/pages/posts.htm" , {config:config , posts:custom.searchPosts(req.params.query,req.params.last),query:escape(req.params.query),private:sdata,adminMenuItem:sdata?(ydb.getUserInformation(sdata.name).login==="a"):false,interests:false});
		ydb.logEverything("SEARCH",{query:[req.params.query,req.params.last],session:sdata,realIP:req.headers["x-real-ip"]});
	});

	app.get("/posts/:id" , (req,res)=>{
		var sdata = ydb.checkSession(req.cookies['focUSA']);
		res.render(__dirname+"/pages/posts.htm" , {config:config , posts:custom.viewPostbyID(req.params.id),query:"",private:sdata,adminMenuItem:sdata?(ydb.getUserInformation(sdata.name).login==="a"):false,interests:false});
		ydb.logEverything("SEARCH",{query:req.params.id, session:sdata,realIP:req.headers["x-real-ip"]});
	});

	app.post("/posts/search" , (req,res)=>{
		var sdata = ydb.checkSession(req.cookies['focUSA']);
		res.render(__dirname+"/pages/posts.htm" , {config:config , posts:custom.searchPosts(req.body.query,req.body.last),query:escape(req.params.query),private:sdata,adminMenuItem:sdata?(ydb.getUserInformation(sdata.name).login==="a"):false,interests:false});
		ydb.logEverything("SEARCH",{query:[req.params.query,req.params.last],session:sdata,realIP:req.headers["x-real-ip"]});
	});

	app.post("/posts/delete" , (req,res)=>{
		var sdata = ydb.checkSession(req.cookies['focUSA']);
		var id = req.body.id;
		if(sdata && id && sdata.ip==req.ip) {
			//if user performing delete is admin, or the user who posted it...
			if(custom.deletePost(sdata.name,id)) res.redirect("back");
			else res.send("Delete failed. Please try again.");
			//logEverything in customAcc.js
		} else res.redirect("/403");
	});

	app.get("/posts/delete/:id" , (req,res)=>{
		var sdata = ydb.checkSession(req.cookies['focUSA']);
		var id = req.params.id;
		if(sdata && id && sdata.ip==req.ip) {
			//if user performing delete is admin, or the user who posted it...
			if(custom.deletePost(sdata.name,id)) res.redirect("back");
			else res.send("Delete failed. Please try again.");
			//logEverything in customAcc.js
		} else res.redirect("/403");
	});

	app.get("/posts/edit/:id" , (req,res)=>{
		var sdata = ydb.checkSession(req.cookies['focUSA']);
		var id = req.params.id;
		if(sdata && sdata.ip==req.ip) {
			res.render(__dirname+"/pages/postform.htm" , {config:config , data: ydb.Reference().child("posts").child(id).getValue(), topics: custom.getTopics() , uname:sdata.name , edit:true , error:false});
		} else res.redirect("/403");
	});

	app.post("/posts/edit/:id" , (req,res)=>{
		var sdata = ydb.checkSession(req.cookies['focUSA']);
		var id = req.params.id , data = req.body.description;
		if(sdata && sdata.ip==req.ip) {
			if(custom.editPost(sdata,req.headers,id,data)) res.redirect("/posts/search/"+sdata.name);
			else res.render(__dirname+"/pages/postform.htm" , {config:config , data: ydb.Reference().child("posts").child(id).getValue(), topics: custom.getTopics() , uname:sdata.name , edit:true , error:true});
		} else res.redirect("/403");
			//logEverything in customAcc.js
	});

	app.get("/posts/report/:id" , (req,res)=>{
		//allows ANY USER to report a post to an administrator...
		//reporting allows a user to alert the admin about an objectionable post prior to anybody seeing it...
		var sdata = ydb.checkSession(req.cookies['focUSA']);
		var id = req.params.id;
		custom.reportPost(id,sdata,req.headers);
		res.redirect("back");	//come back to the old page
	});

	if(!config.commenting) app.get("/comment/*" , (req,res)=>{
		res.send("The commenting feature has been disabled by the network administrator.");
	});

	if(!config.mailAttachments) app.get("/mail/*" , (req,res)=>{
		res.send("Unfortunately, this service has been disabled for a select category of users. Please try again if you did not expect this.");
	});
}