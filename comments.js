/*
	This module contains the request handlers for comments in FOCUSA v3.0.0

	@author: yash.diniz;
*/
var ydb = new (require(__dirname + "/ydb"))();
var custom = require(__dirname + "/customAcc.js");

var config = require(__dirname+"/config.json");		//the config file for more flexibility
var bodyParser = require("body-parser");

module.exports = (app)=> {

	app.use(require("cookie-parser")("focUSA"));
	app.use(bodyParser.urlencoded({extended:false}));

	//POST comment will be used to read and add a comment to a specific post
	app.post("/comment" , (req,res)=>{
		var sdata = ydb.checkSession(req.cookies['focUSA']);
		var data = req.body.data , id = req.body.id;
		if(sdata && sdata.ip) {
			s = custom.commentPost(sdata,id,data);
			//console.log("Comment",s);
			if(s) res.redirect("back");	//come back to see the updated post
			else res.send("Comment failure. Please try again.");
		} else res.redirect("/403");
	});

	//will be used to delete a comment
	app.get("/comment/delete/:post/:time" , (req,res)=>{
		console.log("Comment delete requested: ",req.params.post,req.params.time);
		var sdata = ydb.checkSession(req.cookies['focUSA']);
		s = custom.commentDelete(sdata,req.headers,req.params.post,req.params.time);
		//console.log(s);
		if(s) res.redirect("back");	//come back to see post
		else res.redirect("/403");
	});
}