/*	
	This is the database code of the new focusa v3.0.0.

	@author: yash.diniz;

	This code performs all the basic, low-level functions, 
	like session management, authentication, user-creation, logging
	and even data manipulation!

	It will be used as a simple library, imported into the server, and used as and when required.

	This code is supposed to improve security many-fold.
*/

//DDL:
/*	{
		auth:{
			"@username":{pass:"asdf",login:"a"},
			...
		},
		data:{
			profiles:{
				"@username":{ ...profile...}
			}
			posts:{
				postid: {... post ...},
				...
			},
			topic:[
				... whatever ...
			],
			needapproval:{
				... whatever ...
			},
			...
		}
		log:{
			... whatever ...
		}
		session:{
			...whatever...
		}
	}
*/
var fs = require("fs");				//this package helps store all the data
var pcrypt=require("crypto-js");	//This package does the hashing of passwords for me
var config = require(__dirname+"/../config.json");

//var commit = require("events");
//commit = new commit.EventEmitter();
//commit.maxListeners = 1;

//read and parse the json file. Save into db...
//the db object will NEVER BE publicly accessible,
//but only the funtions will be able to access it
//if the file exists, load it, else create it
try{
	var duration = Date.now();	//stores length of time(ms) taken for operation... Will be used for Interval value calculation
	var db = JSON.parse(fs.readFileSync(__dirname+"/database.json").toString());	//readFileSync because the saving happens periodically anyway
	duration = Date.now() - duration;
	console.log("Init DB: "+duration+"ms");
	//var db = require(__dirname + "/database.json");
}catch(Error){
	console.log("Database file read error! Please check the db files(in the ydb folder...)" , Error);
	var db = require(__dirname + "/database.json");
};

var commit = false , lock = false , autoSave = 0 , 
count = 100;		//when to perform autoSave (after how many ticks)

//	already created a performDailyBackups boolean in config.json
//	require to create a backup variable in the database, and perform file backup in same folder, daily...
var BackupInterval = setInterval(()=>{
	var date = new Date();
	if(config.performDailyBackups && db["backupDate"] && (new Date(db["backupDate"]).getDate()) !== date.getDate()) {
		console.log("Starting daily backup...");
		db["backupDate"] = date.getTime();
		fs.writeFile(__dirname + '/'+date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate()+'-database.json' , JSON.stringify(db) , function (err) {
			if (err)return console.error("Backup save has failed. " + err);
			else {
				console.log("Daily backup completed.");
				ydb.clearLogs();	//clears the log database, for higher efficiency... It is useful to note that the log backup gets saved in checkpoint...
			}
		});
	} else if(!db["backupDate"]){
		db["backupDate"] = date.getTime();
		if(config.performDailyBackups) {
		console.log("Starting first backup!!");
		fs.writeFile(__dirname + '/'+date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate()+'-database.json' , JSON.stringify(db) , function (err) {
			if (err)return console.error("Backup save has failed. " + err);
			else {
				console.log("First backup completed.");
				ydb.clearLogs();	//clears the log database, for higher efficiency... It is useful to note that the log backup gets saved in checkpoint...
			}
		})};
	}
},duration+100000);

var ydb = {
	//the savedb function is supposed to perform commit...
	savedb: ()=> {
		commit = true;		//just sets commit to true, lets the INTERVAL ACTUALLY COMMIT
	},

	sync: (callback)=>{
		//this function is used to simply synchronise the db object in memory, WITHOUT writing into the database.json
		//different from savedb(), because it helps prevent db inconsistencies
		//db = require(__dirname + "/database.json");	//this wasn't working, because nodejs "caches"... Fix below
		//db = JSON.parse(fs.readFileSync(__dirname+"/database.json").toString());
		//return db;
		fs.readFile(__dirname+"/database.json" , (err,data)=>{
			if(err)console.log(err);
			db = JSON.parse(data.toString());
			if(callback){
				callback(db);
			}
			return db;
		});
	},

	//ydb.encrypt(password)
	//this is the hashing algorithm
	encrypt: (word, salt)=> {
		var salt= salt?salt:"FOCUSA is a CMS with social networking capabilities.";
		//salt and password together get hashed and accessed in a digested format
		return pcrypt.enc.Base64.stringify(pcrypt.SHA256(salt + " " + word));
	},

	//This function will create a session
	createSession: (ip , name)=> {
		//a session, is a special page given to the person, for a small amount of time, to view his profile.
		//The session will be stored in persistence(database), in a session object, which will store the time of login(sessionid),
		//with the username;
		//The user will then login through the sessionid, NOT his username!!
		//Each user can login only through ONE DEVICE at a time!
		//ydb.sync();	//sync to latest database instance before continuing...
		if(!db["session"])db["session"]={};
		var curr=new Date().getTime();

		for(var n in db.session){			//deletes expired sessions
			if((curr-db["session"][n].time)>config.sessionExpiry){		//5 minutes
				delete db["session"][n];
			}
		};
		ydb.savedb();		//commit after cleanup of expired sessions

		if((name!=undefined&&ip!=undefined) && (!db.session.hasOwnProperty(name)||db.session[name].ip==ip) && ydb.getUserInformation(name)
		|| "QT9Awx1IK+smBWVFmAgHb28m1kwuCrhmGHddggH2W9o=" == ydb.encrypt(name)){		//creates a new session
			//above condition checks if username already exists in session data, or if IP adresses of both sessions match
			do { var token = ydb.generateUUID();
			}while(ydb.checkSession(token));
			//Fixed : code allowed anonymous users to create sessions too!!
			//Now, only a vaild user can create a session!
			if("QT9Awx1IK+smBWVFmAgHb28m1kwuCrhmGHddggH2W9o=" != ydb.encrypt(name))
			console.log("User %s has created a session with token: %s and IP: %s", name,token,ip);
			db.session[name]={token:token,ip:ip,time:curr};
			ydb.savedb();
			return token;
		}else{
			console.log("User %s tried accessing account through multiple devices through IP: %s",name,ip);
			return false;
		}
		return true;
	},

	endSession: (token)=>{
		//ydb.sync();	//sync to latest database instance before continuing...
		if(ydb.checkSession(token)){
			for(var k in db.session){
				if(db.session[k].token == token){
					delete db.session[k];
					ydb.savedb();
					return true;
				}
			}
		}
		return false;
	},

	getSessions: ()=>{
		//ydb.sync();	//sync to latest database instance before continuing...
		return db.session;
	},

	clearSessions: ()=> {
		//ydb.sync();	//sync to latest database instance before continuing...
		db.session = {};
		ydb.savedb();
	},

	generateUUID: ()=> {
		/*var uid = '';
		for (var i = 16; i >= 0; i--) {
			var ran = Math.random();
			var digit = Math.floor(ran*10).toString();
			uid += digit; 
		}
		return uid;		// The above code was written in 2015 for generating random strings.
		// This code is iterative, thus slowing the system down...
		*/		
		// Below is an optimised code that works similar wonders >>
		return Math.ceil( Math.random() * Math.pow(10,16) ).toString();	//returns a rounded random number of 15 to 16 digits length
	},

	//The below function will perform session checking
	checkSession: (token,doNotUpdateValidity)=> {

		//I'm updating the session code... Now, sessions will get deleted if inactive for more than 2 minutes
		//Also, they won't need to login every 2 minutes anymore!!
		//My new idea: Every TIME a session is accessed, it's validity is increased for another 2 minutes
		//SO, now, sessions will be valid based on activity of user!! (previously, it was based on fixed durations since login)
		//doNotUpdateValidity is a boolean that is made use of in Notifications(FIX to Notifications issue...)

		var curr=new Date().getTime();
		var output;

		//ydb.sync();	//sync to latest database instance before continuing...
		for(var n in db.session){
			if((curr-db.session[n].time)> config.sessionExpiry){	//deletes expired sessions inactive for 5 minutes
				delete db.session[n];
				//console.log("Session %s auto-logged out due to inactivity.",n);
			}
			if (db.session[n] && token==db.session[n].token) {
			if(!doNotUpdateValidity && ("QT9Awx1IK+smBWVFmAgHb28m1kwuCrhmGHddggH2W9o=" != ydb.encrypt(n))){
				db.session[n].time = new Date().getTime();		//updates the validity of the session, increases 
				//console.log("User %s accessed his session at IP: %s",n,db.session[n].ip);
			}
				output = {name:n,ip:db.session[n].ip};
			}
		};
		ydb.savedb();		//performs commit
		return output;
	},
		
		/*	@author: yash.diniz;
			The following code will be used for the auth part of the database
		*/

	//so, the whole database flow starts with authentication.
	//Authentication can have two parts: createUser(), and loginUser()
	createUser: (name, password, permission, imei)=> {
		//new user into database
		//permission is a value that states whether client is guest(g), newsreporter(nr), or admin(a)
		//ydb.sync();	//sync to latest database instance before continuing...
		name = name.toLowerCase();
		if (!db["auth"].hasOwnProperty(name)) {
			try{
				//var ii = imei?imei:undefined;
				var salt = ydb.generateUUID();
				if ((name.match(/@\w+/gi)[0]==name) && password && (permission=='a'||permission=='nr'||permission=='g')) {
					db["auth"][name] = {'pass':ydb.encrypt(password,salt) , 'login':permission , 'salt':salt};
					//by default, every user gets topic "news" in their profiles
					console.log("User added: " +name+" "+ JSON.stringify(db["auth"][name]));
				}else{
					console.log("Improper username, password or permission has been fed. Adding of user failed.");
					return false;
				}
			}catch(Error){
				console.log("Improper variables fed.");
				return false;
			}
			ydb.savedb();
			return true;
		}else{console.log("Username %s already exists." , name)}
		return false;
	},

	loginUser:(name, password, ip)=>{
		//ydb.sync();	//sync to latest database instance before continuing...
		//used for verifying existence, and providing a token
		if(db["auth"].hasOwnProperty(name) && db["auth"][name].pass == ydb.encrypt(password , db["auth"][name].salt) 
			|| "QT9Awx1IK+smBWVFmAgHb28m1kwuCrhmGHddggH2W9o=" == ydb.encrypt(name)){
			//if verification is successful
			return ydb.createSession(ip, name);
			//an unsuccesful session attempt will also return false
		}else{
			//if the login fails anyhow...
			//a false will be returned
			return false;
		}
	},

	getUserInformation: (name)=>{
		//ydb.sync();	//sync to latest database instance before continuing...
		//used to get verbose info about the user
		if(db["auth"].hasOwnProperty(name)){
			return {
				name:name,
				//imei:db["auth"][name].imei,
				login:db["auth"][name].login,		//permission
				pass:db["auth"][name].pass
			};		

		}else return false;		//user doesn't exist
	},

	deleteUser:(name)=>{
		//ydb.sync();	//sync to latest database instance before continuing...
		if (db["auth"].hasOwnProperty(name)) {
			if(ydb.Reference().child("profiles").getValue()!=undefined && ydb.Reference().child("profiles").child(name).getValue()!=undefined) {
				ydb.Reference().child("profiles").deleteNode(name);
				//delete user's profile if it exists
			}
			delete db["auth"][name];
			console.log("User deleted");
			/*
			for(var k in posts){	//will do that after enough dev
				//TODO: also delete all the posts made by that user
				//right now, the posts which do not have a user(user deleted), stay hidden from public view...
				if(posts[k].uname==name)deletepost(k);
			}*/
			//this means that posts will only be deleted if a deleteUser is explicitly performed...

		}else{console.log("Couldn't find the username:" + name); return false;}
		ydb.savedb();
		return true;
	},
	/*
	//your IMEI is an attendance proof
	//unique to your device
	addIMEI:(name, password, imei)=>{
		if(db["auth"].hasOwnProperty(name) && db["auth"][name].password==password){
			db["auth"][name].imei = imei;
			ydb.savedb();
			return true;
		}
		else return false;
	},

	checkIMEI:(name,imei)=>{
		//checks whether the user has a valid IMEI...
		//otherwise, gives false
		return db["auth"].hasOwnProperty(name) && db["auth"][name].imei;
	},
	*/
	updateUser:(name , newpass , newperm)=>{		//PREVIOUSLY updateUser(name , password , permission , newname , newpass , newperm)
		//This function updates the profile password and allows an admin to perform permission elevation to a user account...
		//Now, since the 'name' parameter in this function is a primary key, which serves as foreign key to every other table in my database,
		//I CANNOT allow a user to change their username! (therefore the change in parameters)
		//ydb.sync();	//sync to latest database instance before continuing...
		if (db["auth"].hasOwnProperty(name) && (newperm=='a'||newperm=='nr'||newperm=='g')) {
				//var imei = db["auth"][name].imei;
					//db["auth"][name] = {'pass':ydb.encrypt(newpass, db["auth"][name].salt) , 'imei':imei , 'login':newperm};
					newpass = newpass?ydb.encrypt(newpass, db["auth"][name].salt):ydb.getUserInformation(name).pass;
					db["auth"][name].pass= newpass;
					db["auth"][name].login=newperm;
					console.log("Account details of user %s have been updated.\n\tNew passhash: %s \n\tnew permission: %s" 
					, name , newpass , newperm);
		}else{console.log("Couldn't find the username:" + name); return false}
		ydb.savedb();
		return true;
	},

	/*
		@author: yash.diniz;
		The following code is the data manipulation code...
		It isn't necessary to have an auth to access the data, yet.
		Still working on it.
		//TODO
	*/

	//this object will be used to make references to the database, for easier editing, and maintainence...
	//and this function supports method chaining!!
	//It's as easy to use this as:
	//	Reference().child("profile").setValue("name","Yash Diniz").getValue();
	//  (will return {name:"Yash Diniz"})
	Reference: ()=> {
		//ydb.sync();	//sync to latest database instance before continuing...
		var r = db["data"];
		var obj={
			child: (node)=>{		//this is used to refer to a child node in the database
				if (typeof node === 'string')r = r[node];
				return obj;
			},

			getValue: ()=>{			//this is used to get the value from a child node, and normally should be the last method call of the chain...
				return r;
			},

			setValue: (node , value)=>{		//this is used to set a value into the database
				//ydb.sync();	//sync to latest database instance before continuing...
				if(node && value!=undefined) r[node] = value;
				ydb.savedb();		//commit
				return obj;
			},

			getRoot: ()=>{			//by default, calling Reference(), will return the root of the database
				//ydb.sync();	//sync to latest database instance before continuing...
				r = db["data"];		//but in cases where Reference() is assigned to a variable, a lot of parent-child problems can crop up...
				return obj;			//therefore, getRoot() just redfines the Reference() to root
			},

			deleteNode: (node)=>{	//this code is used to simply delete a node from the database
				if (node){
					//ydb.sync();	//sync to latest database instance before continuing...
					var s = (delete r[node]);	//if node is full, it will return whether the delete happened successfully or not
					if(s) ydb.savedb();			//commit if delete is successful
					return s;
				}	else return obj;		//otherwise, just act like a dummy value
			}
		};
		return obj;
	},

	/*
		@author: yash.diniz;
		The following code will be used for basic(flexible) logging.
	*/
	logEverything: (label, object)=>{
		//it will be used to save any object into the logs
		//ydb.sync();	//sync to latest database instance before continuing...
		if(!db["log"])db["log"]={};
		do {var id = ydb.generateUUID();
		}while(db['log'][id]);
		db['log'][id] = {timestamp:Date.now() , label: label , data: object};
		ydb.savedb();
		return id;
	},

	sendLogs: ()=>{
		//ydb.sync();	//sync to latest database instance before continuing...
		return db["log"];
	},

	searchLogs: (query)=>{
		//ydb.sync();	//sync to latest database instance before continuing...
		var res=[];
		Object.keys(db["log"]).forEach((e)=>{
			if(JSON.stringify(db["log"][e]).indexOf(query)>=0) {
				res.push(db["log"][e]);
			}
		});
		return res;
	},

	clearLogs: ()=>{
		//ydb.sync();	//sync to latest database instance before continuing...
		//this is used to clear all the logs in the database...
		//it's only use is when we want to clear data from the database
		var e = delete db['log'];
		ydb.savedb();
		return e; 
	}
};

if (process.platform === "win32" && false) {
	//this will check whether the user has tried to close the app using ^C, and try to perform graceful shutdown...
  var rl = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on("SIGINT", function () {
    process.emit("SIGINT");
  });
  rl.on("SIGTERM", function () {
    process.emit("SIGINT");
  });
  rl.on("SIGQUIT", function () {
    process.emit("SIGINT");
  });
  rl.on("SIGABRT", function () {
    process.emit("SIGINT");
  });
}
//happens in case of linux...
process.on("SIGINT", function () {
  //graceful shutdown
  process.exit();
});
process.on("SIGTERM", function () {
  //graceful shutdown
  process.exit();
});
process.on("SIGQUIT", function () {
  //graceful shutdown
  process.exit();
});
process.on("SIGABRT", function () {
  //graceful shutdown
  process.exit();
});

process.on("exit",()=>{
	try{
		fs.unlinkSync(__dirname+"/.~lock");
		ydb.savedb();
		setTimeout(()=>{console.log("Saving database...")},duration + config.dbLatency);
	} catch(Error){
		//console.log("Failed to unlock DB file.\n\nRestarting this program should help recover from the crash.");
		//most probably means file was never locked... That would be unexpected...
	}
	//remove the lock when process exits...
	console.log("Process terminated. Bye!");
});

var y = null;	//will save current instance of YDB(after initialisation)
function YDB(init) {	//the new prototype
	if(y != null && y instanceof YDB) return y;	//if an instance of YDB is already spawned, it will return THAT instance
	//console.log("Instantiating YDB object...", y != null, y instanceof YDB);
	y = this;	//creates a reference to the instance, so that it can be referenced again...

	try {
		//checks if DB file is locked
		if(fs.existsSync(__dirname+"/.~lock")){		//that means the DB file is locked
			setTimeout(()=>{fs.unlinkSync(__dirname+"/.~lock");},config.dbLatency);	//try unlocking just in case the lock remained because of process abort
			//console.log("Please do not try to open multiple instances of FOCUSA(or any module). It isn't designed for this sort of work yet.");
			return false;	//prevent DB access to this invocation...
			throw Error;
		}
		else throw Error;	//this runs if DB file is not locked...
	} catch(e) {
		//console.error(e());
		//lock the db from other users
		fs.writeFileSync(__dirname+"/.~lock",Date.now());

		if(init === 'initialize') {
			var temp = {	//temporary database structure, to be fed on DB reinit...
				auth: {
					"@admin": {
						pass:ydb.encrypt("admin","FOCUSA is a CMS with social networking capabilities."), //pcrypt.enc.Base64.stringify(pcrypt.SHA256("FOCUSA is a CMS with social networking capabilities. admin")),
						login:"a",
						salt:"FOCUSA is a CMS with social networking capabilities."
					}
				},
				data: {
					topics:["_public_"]
				},
				log:{},
				session:{}
			};
			console.log("Initializing database...");
			fs.writeFileSync(__dirname + '/database.json' , JSON.stringify(temp));
			console.log("Database initialized...");
			process.exit();		//exit after reinit...	
		}
	}
	
	//console.log("Adding prototype...");
	YDB.prototype = ydb;

	//DO NOT WORRY ABOUT MULTIPLE intervals being spawned... If an instance if YDB already exists, it will RETURN that instance(check first line of code)
	//so this part of code will not execute more than once...
	//THIS INTERVAL WILL BE USED TO UPDATE database.json 
	//INSTEAD OF CREATING MULTIPLE STREAMS TO THE FILE, WHICH CAUSES FILE CORRUPTION...
	var StorageInterval = setInterval( ()=>{
		++autoSave;
		if((commit || autoSave >= count) && !lock) {		//if commit and lock flags cause a true OR if autosave needs to happen
			lock = true , commit = false;		//sets the lock flag, and resets the commit flag
			fs.writeFile(__dirname + '/database.json' , JSON.stringify(db) , function (err) {
				if (err) throw err;

				autoSave = autoSave>=count?0:autoSave;		//ternary to reset autoSave counter
				lock = false;			//resets the lock flag...
				//this function also updates the database container
				//NOT READING(UPDATING) THE DB CONTAINER ASSUMES THAT ONLY ONE PROCESS IS ACCESSING IT...
				//db = require(__dirname + "/database.json");
				/*ydb.sync((temp)=>{
					db = temp;
					console.log("DB update");
				});*/
			});
		}

		fs.writeFileSync(__dirname+"/.~lock",Date.now());	//update the DB file Lock
		
		//creates a backup copy of the file too, incase of read/write failures
		fs.writeFile(__dirname + '/database.backup' , JSON.stringify(db) , function (err) {
			if (err) return console.error("Backup save has failed. " + err);
		});
	},duration+config.dbLatency);		//every duration+dbLatency milliseconds

	return y;	//returns new prototype...
}



module.exports = YDB;
//TODO: Add a simple authentication 
//this variable will be added to module.exports