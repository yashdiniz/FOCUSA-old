/*
	This code handles mailing of attachments to a user's email account.

	@author : yash.diniz;
*/
var ydb = new (require(__dirname + "/ydb"))();
var custom = require(__dirname + "/customAcc.js");

var config = require(__dirname+"/config.json");		//the config file for more flexibility
var bodyParser = require("body-parser");

module.exports = (app)=>{

	app.use(require("cookie-parser")("focUSA"));
	app.use(bodyParser.urlencoded({extended:false}));

	//this allows a client to send an email to a person that has requested it.
	app.get("/mail/:id" , (req,res)=>{
		var sdata = ydb.checkSession(req.cookies['focUSA']);
		if(sdata && sdata.ip == req.ip)
		res.render(__dirname+"/pages/mailform.htm" , {user:sdata.name});
		else res.send("Unfortunately, this service has been disabled for a select category of users. Please try again if you did not expect this.");
	});

	app.post("/mail/:id" , (req,res)=>{
		var sdata = ydb.checkSession(req.cookies['focUSA']);
		var id = req.params.id , recipient = req.body.to;
		ydb.logEverything("MAILSERV" , {id: id, sdata:sdata, recipient:recipient,realIP:req.headers["x-real-ip"]});
		if(sdata && sdata.ip == req.ip) {
			custom.sendMail(id,sdata,recipient);
			res.send("This e-mail will be sent shortly. You can now go back to doing your work, and wait for a notification, or check your email to see if it has successfully delivered.");
			//else res.send("An error occured while sending the email. Please try again, or contact the network administrator(in this case, the lab incharge).<br>\
			//	Possible errors include: Attachment too large, improper recipient emails, or no internet connection to the server.");
		} else res.send("Unfortunately, this service has been disabled for a select category of users. Please try again if you did not expect this.");
	});
}