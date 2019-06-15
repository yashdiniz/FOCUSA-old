/*
	This module contains the request handlers for displaying profiles in focusa v3.0.0

	@author: yash.diniz;
*/
var ydb = new (require(__dirname + "/ydb"))();
var custom = require(__dirname + "/customAcc.js");

var config = require(__dirname+"/config.json");		//the config file for more flexibility
var bodyParser = require("body-parser");
var multer = require("multer");

var upload = 
multer({
	"storage":multer.diskStorage({
				destination: (req, file, callback) => {
		    		callback(null, __dirname+"/docs/public/dp/");
		  		},
		  		filename: (req, file, callback) => {
		    		if(file.mimetype.match(/image\/[jpeg|gif]/))
		    		callback(null, Date.now() + "-" + file.originalname);
		  		}
	}),
	"limits":{
		fileSize: (config.allowBigFileUploads?Infinity:2097152) , //basically, not larger than 2MB
		files: 1	//only one file element in the form(prevents malicious forms)
	},
	"fileFilter": (req,file,callback) => {	//this function will make sure only jpeg/gif files are accepted...
		if(file.mimetype.match(/image\/[jpeg|gif]/)) callback(null,true);
		else callback(null,false);
	}
}).single('Picture');		//this variable decodes the file uploaded, from the request data (basically acts as middleware)

module.exports = (app) => {

	app.use(require("cookie-parser")("focUSA"));
	app.use(bodyParser.urlencoded({extended:false}));

	//basically, profile consists of two portions, the public portion(where I can view your profile)
	//and the personal profiles, where session validation is required...
	//following is the public portion
	if(config.allowPublicProfileViewing)		//if config allows public profiles
	app.get("/profile/:username", (req,res)=>{
		var sdata = ydb.checkSession(req.cookies['focUSA']);
		var username = req.params.username;
		if(ydb.getUserInformation(username))res.render(__dirname+"/pages/profile.htm" , {user:custom.getProfileData(username), public:true, private:sdata, admin:sdata?ydb.getUserInformation(sdata.name).login==='a':false});
		else res.redirect("/404");
	});

	//this is the personal version
	app.get("/me", (req,res)=>{
		var sdata = ydb.checkSession(req.cookies['focUSA']);
		if(sdata && sdata.ip == req.ip) res.render(__dirname+"/pages/profile.htm" , {user:custom.getProfileData(sdata.name), public:false, private:sdata, admin:sdata?ydb.getUserInformation(sdata.name).login==='a':false});
		else res.redirect("/403");
	});

	//used when a user wishes to update their profile picture
	app.post("/dp", (req,res)=>{
		var sdata = ydb.checkSession(req.cookies['focUSA']);
		ydb.logEverything("DPUPDATE",{file:req.file,ip:req.ip,name:sdata.name,realIP:req.headers["x-real-ip"]});
		upload(req,res,(err)=>{
			if(err){
				ydb.logEverything("DPERROR",{error:err,ip:req.ip,name:sdata.name,realIP:req.headers["x-real-ip"]});
				res.send("Attempted to upload a huge file: The network administrator has not allowed uploading of files this large. Please contact Network administrator for more information.");
				return;
			}	
			if(sdata && sdata.ip == req.ip) {
				if(custom.updateProfilePicture(sdata.name, req.file)) res.redirect("/me");
				else res.send("An error occured while sending the picture. Picture was either empty, or unsupported. We currently accept only gif and jpeg images.");
			} else res.redirect("/403");
		});
	});

	app.get("/update", (req,res)=>{
		var sdata = ydb.checkSession(req.cookies['focUSA']);
		if(sdata && sdata.ip == req.ip)
			res.render(__dirname+"/pages/profileform.htm" , {user:custom.getProfileData(sdata.name) , error:false});
		else res.redirect("/403");
	});

	app.post("/update", (req,res)=>{
		var sdata = ydb.checkSession(req.cookies['focUSA']);
		var fname = req.body.fname , status = req.body.status;
		ydb.logEverything("PROFILEUPDATE",{uname:sdata.name, fname:fname, status:status, ip:req.ip,realIP:req.headers["x-real-ip"]});
		if(sdata && sdata.ip == req.ip){
			if(custom.updateProfile(sdata.name, fname, status))res.redirect("/me");
			else res.render(__dirname+"/pages/profileform.htm" , {user:custom.getProfileData(sdata.name) , error:true});
		} else res.redirect("/logout");
	});

	if(config.allowChangePassword) {
		app.get("/pwd", (req,res)=>{
			var sdata = ydb.checkSession(req.cookies['focUSA']);
			if(sdata && sdata.ip == req.ip)
				res.render(__dirname+"/pages/password.htm");
			else res.redirect("/403");
		});

		app.post("/pwd", (req,res)=>{
			var sdata = ydb.checkSession(req.cookies['focUSA']);
			var current = req.body.current , newpass = req.body.newpass , confirm = req.body.confirm;
			if(sdata && sdata.ip == req.ip && (current && newpass && confirm && newpass == confirm) && ydb.updateUser(sdata.name, newpass, ydb.getUserInformation(sdata.name).login)) {
				res.redirect("/me");
			} else res.status(403).send("Failed to update password. Please check whether the new password matches the confirm password.");
		});	
	}
}