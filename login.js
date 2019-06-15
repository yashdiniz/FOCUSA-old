/*
	This module contains the login request/response code needed for focusa v3.0.0

	@author: yash.diniz;
*/
var ydb = new (require(__dirname + "/ydb"))();
var custom = require(__dirname + "/customAcc.js");

var config = require(__dirname+"/config.json");		//the config file for more flexibility
var bodyParser = require("body-parser");

var tempsess = {};		//used for signup, to store the verification token for the new user

module.exports = function(app){
	//one of the new things of FOCUSA, is that we'll be using signed cookies, instead of keeping the sessionData in the url
	app.use(require("cookie-parser")("focUSA"));

	app.use(bodyParser.urlencoded({extended:false}));

	//GET /login, gives you the login page
	app.get("/login" , (req,res)=>{
		res.setHeader("X-Frame-Options" , "DENY");
		var sdata = ydb.checkSession(req.cookies['focUSA']);
		if(sdata) res.redirect("/me");
		else res.render(__dirname + "/pages/login.htm",{animate:true , error:false , config:config});
	});

	//POST /login, used for easing the whole login process, providing the session token for the next part
	//First, login...
	app.post("/login", (req,res)=>{
		var name = "@"+req.body.name , pass = req.body.pass;
		if(name && pass){
			var s = ydb.loginUser(name , pass , req.ip);
			if(s){
				console.log("User %s has logged in from ip %s",name , req.ip);
				ydb.logEverything("login",{name:name, ip: req.ip,realIP:req.headers["x-real-ip"]});
				res.cookie("focUSA" , s , { maxAge: 1000 * 60 * 60 , httpOnly:true } )		//, secure:true//a cookie for an hour
				.redirect("/check");
			}else {
				//console.log("User login failed.");
				res.status(403).render(__dirname+"/pages/login.htm" , {animate:false , error:!s , config:config});
				//prevents animation, and shows error if user login fails
			}
		}else{
			res.render(__dirname+"/pages/login.htm" , {animate:false , error:true , config:config});
		}
	});

	/*
	//FEATURE: implement a guest signup procedure (not a to do)
	//FIX: not being added because of fear of fake profiles...
	app.get("/signup",(req,res)=>{
		tempsess[req.ip] = ydb.generateUUID();
		res.render(__dirname+"/pages/login.htm" , {animate:false , error:!s , signup:true , UUID:tempsess[req.ip]});

	});*/

	app.get("/check" , (req,res)=>{
		//checks if cookies is enabled in the browser
		//otherwise it prevents you from using focusa
		try{
			if(req.cookies.hasOwnProperty("focUSA")) res.redirect("/me");//res.send(req.cookies);
		}catch(e) {
			res.send("Cookies are disabled on your system or you're not logged in. Please enable cookies to continue using this service or log in." +
					"<script>setTimeout('location.assign(\"/login\")',3000)</script>"
				);
		}
	});

	app.get("/logout" , (req,res)=>{
		var token = req.cookies['focUSA'];
		ydb.endSession(token) ?
		console.log("Session %s successfully logged out." , token) : 
		console.log("Session %s failed logging out: Session doesn't exist." , token);
		
		if(token)res.clearCookie('focUSA');		//clear cookie only if it exists
		res.redirect("/login");
	});

	//No no, this request DOES NOTHING MUCH!! It only fires an error to test the Error 500 page...
	app.get("/500" , function (req , res) {
		console.log("Details of source: ",req.ip);
		throw new Error("The forced 500:\n A user has requested the server to crash. But this has been reverted.");
	});
}
