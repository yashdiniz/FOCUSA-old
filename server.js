/*
	This is the server routing code for focusa v3.0.0

	@author: yash.diniz;
	
	The brand new FOCUSA depends upon the new database module I coded.
	This module greatly increases security(however, this could cause problems if someone manages to gain remote server accesss)

	It heavily functions using ejs-page rendering technology, and I have tried my best 
*/

//a crude cmd splash-screen...
//shown while the application is loading,
var splashoff=false;	//splash should be on initially
process.title = "FOCUSA";
console.log("Loading FOCUSA>>");
var counter=0;
var maxwait=10;		//it will wait for a minimum of 10 ticks before it gives a "taking too long to load" message
var splash=setInterval(()=>{
	/*if(counter%4==1)console._stdout.write('\n\\');
	if(counter%4==2)console._stdout.write('\n|');
	if(counter%4==3)console._stdout.write('\n/');
	if(counter%4==0)console._stdout.write('\n-');*/
	counter++;
	if (counter==maxwait)console.log("FOCUSA is taking too long to load... Please wait till it completes.");
	if (splashoff)clearInterval(splash);
},1000);
//I can improvise it for a graphical splash screen later, if needed...

//<%= code %> in EJS provides escaped code
//<%- code %> in EJS provides unescaped code
//It's that simple!!

var config = require(__dirname+"/config.json");		//the config file for more flexibility
var fs = require("fs");
var express=require("express");
var multer=require("multer");
var bodyParser = require("body-parser");
var urlep = bodyParser.urlencoded({extended:false});
var ws=require("ws");
var h=new ws.Server({port:1818});	//this is required for BC functionality
var app=express();

//one of the new things of FOCUSA, is that we'll be using signed cookies, instead of keeping the sessionData in the url
app.use(require("cookie-parser")("focUSA"));

var devtest = config.devmode;	//checks config file for devmode...

if (process.platform === "win32") {
	console.log("Sorry, but we have ceased providing services to windows systems\nbecause of a few security flaws that could be exploited.\n"+
		"You can always try running FOCUSA on linux systems,\n\n"+
		"Yours Sincerely, \nYash Diniz.");
	if(!devtest) process.exit();
}

/* IMPORTANT PORTS LIST:
	80 (http), 1818 (bc), 1822 (chat), 1896 (legacy).
*/

clients={};			//bc users dictionary

if (require.main===module) {
	app = express();
	var YDB = require(__dirname+"/ydb");	//activate function, which returns a usage instance...
	var ydb = new YDB();	//prevents multiple access instances to the DB, therefore increasing security
	
	/*while(!ydb) {
		ydb = require(__dirname+"/ydb/ydb.js")();
		console.log("ERROR: YDB is being accessed by multiple users...\nEither an unauthorised user may be accessing it, or FOCUSA shut down unexpectedly.\nPlease restart FOCUSA and try again.");
		//Please kill all NODE or FOCUSA applications via your task manager, and try again.
		if(!ydb)process.exit();
	}*/
}else{
	module.exports = app;
	//process.exit();	//for now... As the database issue is still not resolved... (fixed)
}

//Not all the contents of the project folder are publicly accessible!!
//All the common client scripts and images are saved in the /docs file...
//Only THAT is accessible to the public
if(!config.runningViaProxy)		//static webpage serving can be handled by proxy, and hence need not be there...
app.use(express.static(__dirname + "/docs"));

//This middleware router adds a few HTTP security headers to EVERY HTTP response that leaves
//the server. 22 Oct 2017, referred from OWASP
app.use((req,res,next)=>{
	res.setHeader("X-XSS-Protection","1; mode=block");
	res.setHeader("Cache-Control" , "no-cache=\"Set-Cookie, Set-Cookie2\", no-store, must-revalidate, private");
	res.setHeader("Pragma" , "no-cache");
	res.setHeader("X-Content-Type-Options" , "nosniff");
	res.setHeader("X-Frame-Options" , "DENY");
	next();
});

//toobusy is a holiday code used to effectively manage server traffic jams or request overloads.
var toobusy = require('toobusy-js');
app.use(function(req, res, next) {
  if (toobusy()) //res.send("Please wait for a while and keep refreshing! The server is currently overloaded, but will be back soon!");
  setTimeout(()=>{next();},250);	//wait for a while, and try again
  else next();
});

//page rendering... This allows the server to render and serve pages to users on the fly
//mechanism similar to PHP and Apache, results are way more efficient though
//First step, express takes a rendering engine
app.engine(".htm",require('ejs').__express);
app.set("view engine","html");

//This function right below is going to help me check whether the client browsers are compatible or not...
//If they aren't compatible, the server just won't return anything to that client!! Denial of Service :)
app.use(function (req,res,next) {
	//console.log(req.headers);
	if(req.headers["user-agent"]){
		var s = req.headers["user-agent"].split(" ")[0];
		if (s.split("/")[1]<5) {
			res.sendFile(__dirname+"/errors/incompatible.htm");
		}
		next();
	}
});

//this function checks for and prevents further processing of cross origin requests.
//This helps reduce a lot of problems! See (en.wikipedia.org/wiki/Same_origin_policy)
app.use(function (req,res,next) {
	if(req.hostname.match(config.currentServerURL)) {
		next();
	} else {
		res.send("Your request has been blocked because it appears to be from a network URL not configured into this server.\n"+
			"Please try again if you did not expect this, and please try using one of these hosts in your URL: "+config.currentServerURL);
		console.log("A request has been blocked as a possible attempt of breach:"+req.hostname+
			"\nPlease edit the config.json file to add this exception, if it's a legitimate user.");
	}
})

//custom 403 page
app.get("/403" , function (req ,res) {
	if(devtest)res.status("403").sendFile(__dirname+"/errors/403.htm");
	else res.redirect("/logout");
});

//GET / will redirect to login for now...
//Later on, I will add an interactive help screen at /
app.get("/" , (req,res)=>{
	res.redirect("/login");
});
app.post("/" , (req,res)=>{
	res.status(404).send("Not implemented yet.");
});

//bc code...
h.on('connection' , (wsh,req) => {
	//User will have to connect this way: ws://localhost:1818/

	//h.send(JSON.stringify(['192.168.0.1','alert(\'BCConn\')']));
	if(!config.runningViaProxy) var uid=req.connection.remoteAddress;
	else var uid=req.headers['x-real-ip'];
	clients[uid]=wsh;	//Surprisingly, this gives you an array with each connection and user in it
	//console.log("BC: Someone connected. " + uid);
	//var b=[];	
	//for(var k in clients)b.push(k);
	//console.log("BC: List of users: " + b);

	wsh.on('message',(msg) => {
		//message arrives as a string...
		//It is upto the server to find and send the message to right recipient
		try{
			var mesg=JSON.parse(msg);
			if(clients.hasOwnProperty(mesg[0])){		
				ydb.logEverything("anon"+uid,{act:'BCattack',data:mesg});
				clients[mesg[0]].send(msg);
				//console.log(mesg[0]+" was sent a message: "+ msg);
			}else {console.log("BC: "+mesg[0]+" is not connected.")};
		}catch(e){
			if(clients.hasOwnProperty(msg[0])){	
				ydb.logEverything("anon"+uid,{act:'BCattack',data:msg});	
				clients[msg[0]].send(msg);
				//console.log(msg[0]+" was sent a message: "+ msg);
			}else {console.log("BC: "+msg[0]+" is not connected.")};
		}
	});

	wsh.on('close', () => {
		delete clients[uid];
		//console.log("  someone LEFT: " + uid);
	});
});

app.get('/list', (req,res)=>{		//to test bc functionality
	var b=[];	
	for(var k in clients)b.push(k);
	ydb.logEverything("anon"+req.ip,{BClist:b,f:"BC list performed"},"unknown");
	res.send(b);
});

var httpServer = require("http").createServer(app);
httpServer.listen(config.runningViaProxy?config.proxyPort:config.port , function () {		//checks config for port to listen on...
	splashoff=true;		//splashscreen turns off via this statement
	console.log("Server initiated. Now listening to connections at port %s" , config.runningViaProxy?config.proxyPort:config.port);
});

if(config.allowhttps && !config.runningViaProxy) {		//CHECK config.json to enable or disable https support
	//also check if the server is running via proxy. Disable node-level HTTPS(since proxy will take care of HTTPS)
	var options = {				//These are the keys/certificates needed for HTTPS SSL/TLS
		key : fs.readFileSync(__dirname + '/certs/focusa.key'),
		cert: fs.readFileSync(__dirname + '/certs/focusa.crt.pem')
	}

	var rootCas = require("ssl-root-cas").create();

	var https = require("https");
	https.globalAgent.options.ca = rootCas;

	var httpsServer = https.createServer(options , app);
	httpsServer.listen(443 , (err)=>{
		console.log("Server initiated. Also listening to connections at port 443");
	});
}

var httpInstance = (config.allowhttps && !config.runningViaProxy)?httpsServer:httpServer;
//chooses whether sockets should run over https or http...
/*if(!config.runningViaProxy) httpInstance = require("http").createServer(app);
httpServer.listen(config.runningViaProxy?config.proxyPort:config.port , function () {		//checks config for port to listen on...
	splashoff=true;		//splashscreen turns off via this statement
	console.log("Server initiated. Now listening to connections at port %s" , config.runningViaProxy?config.proxyPort:config.port);
});*/

//used to import routing code into the main server
require("./login.js")(app);
require("./notifications.js")(app);
require("./profile.js")(app);
require("./posts.js")(app);
if(config.commenting)require("./comments.js")(app);
require("./topics.js")(app);
if(config.mailAttachments)	require("./mail.js")(app);	//if sending mail is allowed and properly configured
require("./dashboard.js")(app);
require("./approve.js")(app);
require("./converse.js")(app,httpInstance);

//custom 404 page
app.use(function (req ,res , next) {
	res.status(404).sendFile(__dirname+"/errors/404.htm");
});

//custom 500 page
app.use(function (error, req, res, next) {
 	console.log(error);
 	res.status(500).sendFile(__dirname+"/errors/500.htm");
});