/*
	This file contains the functions that make use of the Reference Object from ydb.
	@author: yash.diniz;
*/
var ydb = new (require(__dirname + "/ydb"))();

function run() {
var config = require(__dirname+"/config.json");		//the config file for more flexibility
var nodemailer = require('nodemailer');		//used to send mail to users
console.log("YDB container:", ydb);
if(!(ydb instanceof Object)) {	//if ydb is NOT INITIALISED
	console.log("Please do not try to open multiple instances of FOCUSA(or any module). It isn't designed for this sort of work yet.");
	console.log("FOCUSA datastore is being accessed by another app or user.\nIf you are seeing this, an unauthorised user may be accessing it.");	/* Please unplug the ethernet connection or reboot the PC!!*/
	process.exit();
}

if(ydb.Reference().child("posts").getValue()==undefined) {
//IT HAS TO EQUATE TO UNDEFINED! BECAUSE AN EMPTY OBJECT "{}" equates to undefined
	ydb.Reference().setValue("posts",{});
}

if(ydb.Reference().child("profiles").getValue()==undefined) {
//IT HAS TO EQUATE TO UNDEFINED! BECAUSE AN EMPTY SET "{}" equates to undefined
	ydb.Reference().setValue("profiles",{});
}

if(ydb.Reference().child("topics").getValue()==undefined) {
	//topics is an array
	ydb.Reference().setValue("topics",[]);
}

if(ydb.Reference().child("messages").getValue()==undefined) {
	//topics is an array
	ydb.Reference().setValue("messages",{});
}

var posts = ydb.Reference().child("posts").getValue();
var postkeys = Object.keys(posts).sort((a,b)=>{return (posts[a].editedTime?posts[a].editedTime:posts[a].time)-(posts[b].editedTime?posts[b].editedTime:posts[b].time)});
//code that performs sort on the posts in the db
//used for optimising search and retrieve algorithms later on

// create reusable transporter object using the default SMTP transport
var transporter = nodemailer.createTransport({
	host: config.SMTPserver,
	port: config.SMTPport,
	secure: config.SMTPsecure, // true for 465, false for other ports
	auth: {
		user: config.emailID,
		pass: (config.auth.type)? undefined : config.password,
		type: (config.auth.type),
		clientID: config.auth.ClientID,
		clientSecret: config.auth.ClientSecret,
		refreshToken: config.auth.refreshToken,
		accessToken: config.auth.accessToken
	}
});

custom = {
	getProfileData: (username)=> {
		//Example... profileData("@user");	returns all of the user profile Data in the database
		// makes use of reference to return the user data...
		var ref = ydb.Reference();
		var defaults = {dp:"default.gif", fname:username, uname:username, status:"Just another user that will write an about soon.", interests:["_public_"]};
		// if user exists and does not have a profile yet... Create a new profile
		if(ydb.getUserInformation(username) && ref.getRoot().child("profiles").child(username).getValue()==undefined){
			ref.getRoot().child("profiles").setValue(username,defaults);
			custom.notifyUser(username, "Welcome to FOCUSA!","Welcome to the revolution, where technology and education unite!","/public/manpages/index.html","welcome-Hacker");
		}
		else if(ydb.getUserInformation(username))
			return ref.getRoot().child("profiles").child(username).getValue();
		
		return defaults;
	},

	updateProfile: (username, fname, status)=> {
		var ref = ydb.Reference();
		if (ydb.getUserInformation(username) && fname && status && fname.length<=config.profNameLen && status.length<=config.profStatLen) {
			ref.getRoot().child("profiles").child(username)
								 .setValue("fname" , fname)
								 .setValue("status" , status);
		} else return false;
		return true;
	},

	updateProfilePicture: (username, file)=> {
		var ref = ydb.Reference();
		//updates the profile picture if it is stored in the file variable, else, it turns it into the default display picture...
		if (ydb.getUserInformation(username) && file && file.mimetype.match(/image\/[jpeg|gif]/)) {
			ref.getRoot().child("profiles").child(username).setValue("dp" , file.filename);
		}else return ref.getRoot().child("profiles").child(username).setValue("dp" , "default.gif");
		return true;
	},

	searchPosts: (query, last)=> {
		//query is a string that can have the following values: by, with, dynamic...
		//	by: posts by a specific person
		//	with: posts with a specific hashtag
		//	dynamic: posts with a specific keyword...	This has NOT been done yet
		//I have employed a new search and retrieve algorithm
		//it makes use of limits so that it does not need to search through the whole list of posts

		var limit = config.PostSearchLimit,		//posts will be submitted based on the maximum number of posts to send to client
		maxiters = limit*limit,	//this value is just supposed to be an early out strategy if too many posts do not match the query, so that an adversarial search query does not crash the system
		results=[],			//this will store the number of posts that match the query
		itercount = 0;		//this will store the number of total iterations performed during search
		last = last!=undefined?postkeys.indexOf(last):(postkeys.length - 1);
		if(query) {
			query = query.toLowerCase().match(/@\w+|#\w+|\_\w+\_/gi)?query.toLowerCase().match(/@\w+|#\w+|\_\w+\_/gi):[];	//turning the query into an array of strings
			//_topic_, @username, #hashtag in query strings
			for (var i = last; i>=0 && results.length<limit; i--) {
				query.forEach((s)=>{
					if(config.GrandScale && itercount > maxiters) return results;	//this line of code may prevent search over the complete sample space... But helps in early out...
					else ++itercount;
					if (posts[postkeys[i]] && (posts[postkeys[i]]["username"].toLowerCase() == s || (posts[postkeys[i]]["body"] && posts[postkeys[i]]["body"].toLowerCase().match(new RegExp(s+"\\b",'gi'))) || posts[postkeys[i]]["topic"].toLowerCase() == s)) {
						//postkeys contains the order of the posts already...
						//however, to eliminate duplicate results, if [results] already contains that post, it will not be added.
						var post = {
							id:posts[postkeys[i]].id,
							fname:custom.getProfileData(posts[postkeys[i]].username).fname,
							dp:custom.getProfileData(posts[postkeys[i]].username).dp,
							time:posts[postkeys[i]].time,
							uname:posts[postkeys[i]].username,
							topic:posts[postkeys[i]].topic,
							body:posts[postkeys[i]].body,
							tags:posts[postkeys[i]].tags,
							edited:posts[postkeys[i]].edited,
							approve:posts[postkeys[i]].approve,
							report:posts[postkeys[i]].report,
							isImage:posts[postkeys[i]].isImage,
							file:posts[postkeys[i]].file,
							share:posts[postkeys[i]].file?true:false,
							comments:posts[postkeys[i]].comments
						};
						if(post.time<Date.now() && post.approve && results.findIndex((a)=>{if(post.id==a.id)return a;})<0 && ydb.getUserInformation(posts[postkeys[i]].username) && (config.guestsCanPost || ydb.getUserInformation(posts[postkeys[i]].username).login!='g')) {
							//added provisions for scheduled posts. It won't show posts that have a timestamp in the future.
							//if post of id does not exist in array, add post to array
							results.push(post);	//if matches AND not already in results, push to results
						}
					}
				});
			}
		}
		return results;
	},

	viewPostbyID: (id)=>{
		var result=[];
		//id is the ID of the post you wish to see...
		if(postkeys.indexOf(id)>=0) {		//if post exists
			var post = {
				id:posts[id].id,
				fname:custom.getProfileData(posts[id].username).fname,
				dp:custom.getProfileData(posts[id].username).dp,
				time:posts[id].time,
				uname:posts[id].username,
				topic:posts[id].topic,
				edited:posts[id].edited,
				body:posts[id].body,
				tags:posts[id].tags,
				approve:posts[id].approve,
				report:posts[id].report,
				isImage:posts[id].isImage,
				file:posts[id].file,
				share:posts[id].file?true:false,
				comments:posts[id].comments
			};
			result.push(post);
		}
		return result;
	},

	viewApprovalPosts: (last)=>{
		//returns posts that are not approved yet(signified by an approve flag...)
		//last is a dynamic way to directly jump to the post and continue searching from there...
		var counter=0 , limit = config.PostSearchLimit,	//same as searchPosts, but without the query...
		results=[];
		var last = last!=undefined?postkeys.indexOf(last):(postkeys.length - 1);

		for (var i = last; i>=0 && counter<limit; i--) {
			if(posts[postkeys[i]] && (!posts[postkeys[i]].approve || (posts[postkeys[i]].report && posts[postkeys[i]].report.length>0))) {
					var post = {
						id:posts[postkeys[i]].id,
						fname:custom.getProfileData(posts[postkeys[i]].username).fname,
						dp:custom.getProfileData(posts[postkeys[i]].username).dp,
						time:posts[postkeys[i]].time,
						uname:posts[postkeys[i]].username,
						topic:posts[postkeys[i]].topic,
						body:posts[postkeys[i]].body,
						edited:posts[postkeys[i]].edited,
						tags:posts[postkeys[i]].tags,
						approve:posts[postkeys[i]].approve,
						report:posts[postkeys[i]].report,
						isImage:posts[postkeys[i]].isImage,
						file:posts[postkeys[i]].file,
						share:posts[postkeys[i]].file?true:false,
						comments:posts[postkeys[i]].comments
					};
				if(results.findIndex((a)=>{if(post.id==a.id)return a;})<0 && ydb.getUserInformation(posts[postkeys[i]].username)) {
					//if post of id does not exist in array, add post to array
					results.push(post);
					counter++;	//if matches AND not already in results, it increments the counter
				}
			}
		}		
		return results;
	},

	getTopics: ()=> {
		// retrieves topic list...
		return ydb.Reference().child("topics").getValue();	//will send an array containing all topic names
	},

	removeTopic: (topic)=> {
		// removes a topic from topic list...
		var s = [];
 		ydb.Reference().child("topics").getValue().forEach((a)=>{
 			if(a!=topic)s.push(a);
		});
		ydb.Reference().setValue("topics",s);
		return true;
	},
	
	createTopic: (topic)=>{
		// allows admin to create a topic
		// a simple word with underscores is a topic, Eg. _public_
		if(topic.match(/\_\w+\_/gi)[0] == topic) {
			//getValue() will return a Reference to an array, which can be easily edited by a push...
			ydb.Reference().child("topics").getValue().push(topic.toLowerCase());
			return true;
		} else return false;
	},

	toggleFollowTopic: (username , topic)=>{
		//allows a user to follow a topic
		//adds the data to profile
		//also acts as a toggle(if a user already has followed, it will unfollow)...
		if(custom.getProfileData(username)) {
			if(ydb.Reference().child("topics").getValue().indexOf(topic)>=0) {	//topic exists
				if(ydb.Reference().child("profiles").child(username).child('interests').getValue().indexOf(topic)<0) {
					//if user is not following topic
					ydb.Reference().child("profiles").child(username).child('interests').getValue().push(topic);
				} else {
					var s = [];
					ydb.Reference().child("profiles").child(username).child('interests').getValue().forEach((a)=>{
						if(a!=topic) s.push(a);		//will push all values except the topic
						ydb.Reference().child("profiles").child(username).setValue('interests',s);
					});
				}
				return true;
			}
		}
		return false;
	},

	getInterests: (username)=>{
		// returns the interests found in profile data...
		var results = [];
		var allTopics = custom.getTopics();
		if(custom.getProfileData(username)) 
			results = (custom.getProfileData(username)['interests']).filter((s)=>{
				if(allTopics.includes(s)) return s;
			});
		return results;
	},

	savePost: (session , headers , file , body , topic , timestamp)=> {
		//uses the session details, file data, and post body to save a simple post
		do { 
			var id = ydb.generateUUID();
		} while(ydb.Reference().child("posts").child(id.toString()).getValue()); //keep doing as long as post with the same ID already exists
		body = body.trim();		//trims the body string of the post...
		var approve = config.activatePostApproval?(config.newsReporterApproval?(ydb.getUserInformation(session.name).login==='a'):(ydb.getUserInformation(session.name).login!='g')):true;
		//if news reporters also need approval, then only admins can post without needing approval, otherwise, only guests need approval...
		if(session && (file||(body&&body.length<=config.postLen))){	//as long as session AND either file or body(or both) exist...
			var post = ydb.Reference().child("posts").setValue(id.toString(),{}).child(id.toString());	//a reference to the post
			//save the following values into the post
			var timestamp = Date.parse(timestamp); //parses time string of format 'MM-DD-YYYY hh:mm:ss:ms'
			post.setValue("time" , timestamp&&timestamp>Date.now()?timestamp:Date.now());	//the timestamp will only be set to a value in the present or future...
			post.setValue("username" , session.name);
			post.setValue("id" , id);
			post.setValue("topic" , topic?topic:"default");
			post.setValue("approve" , approve);
			if(body){
				post.setValue("body" , body);
				var tags = body.toLowerCase().match(/#\w+/gi);	//the hashtags
				post.setValue("tags" , tags!=null?tags:[]);	
				var mentions = (body.match(/@\w+/gi)!=null)?body.toLowerCase().match(/@\w+/gi):[];
				mentions.forEach((user)=>{		//checks post for mentions, and notifies users if mentioned in the post
					if(user!=session.name)custom.notifyUser(user, session.name + " mentioned you.","Click to view the post.","/posts/"+id);
				});
			}
			if(file){
				if(file.mimetype.match(/image\/[jpeg|gif]/))post.setValue("isImage" , true);
				post.setValue("file" , "/public/documents/"+file.filename);
			}
			postkeys.push(id);		//helps quickly update sorted post keys in the RAM...
		} else return false;
		console.log("User posted:",id,session,file);
		if(!approve) {
			custom.notifyUser(session.name,"Post sent for approval","Your post will be publicly displayed only after it has been reviewed.","/posts/"+id,"approve");
			for (var s in ydb.Reference().child("profiles").getValue()){
				//searches for admins, and notifies them ALL
				if(ydb.getUserInformation(s).login==='a') custom.notifyUser(s,"Post needing approval","Please check posts that need approval by clicking on this notification.","/approve","approve");	
			};
		}
		ydb.logEverything("POST",{id:id, session:session,realIP:headers["x-real-ip"]});
		posts = ydb.Reference().child("posts").getValue();		//refreshing posts after saving
		//postkeys = Object.keys(posts).sort((a,b)=>{return posts[a].time-posts[b].time});	//refresh postkeys
		return true;
	},

	deletePost: (username, id)=> {
		if(posts[id] && (ydb.getUserInformation(username).login==='a' || posts[id].username==username)){
			//post exists AND user is admin or the publisher
			console.log("User deleted post:",id,username);
			ydb.logEverything("DELPOST",{id:id, username:username, postof:posts[id].username});
			if(posts[id].file)require("fs").unlink(__dirname+"/docs"+posts[id].file,(err)=> {
				if(err) console.log(err);
			});
			var ret = ydb.Reference().child("posts").deleteNode(id.toString());
			postkeys = Object.keys(posts).sort((a,b)=>{return posts[a].time-posts[b].time});		//refresh postkeys
			return ret;
		} else return false;
	},

	editPost: (session, headers, id, data)=> {
		data = data.trim();		//trims the body of the post, to eliminate whitespaces at border of string
		if(posts[id] && (data && data.length<=config.postLen) && posts[id].username==session.name) {
			var approved = config.activatePostApproval?(config.newsReporterApproval?(ydb.getUserInformation(session.name).login==='a'):(ydb.getUserInformation(session.name).login!='g')):true;
			//only publisher of post can edit their own post
			var post = ydb.Reference().child("posts").child(id.toString());
			//post.setValue("time",Date.now());
			post.setValue("edited",true);
			post.setValue("editedTime",Date.now());
			if(!approved) post.deleteNode("approve");	//only deletes the approve tag if the user is not an approved user(not admin)
			post.setValue("body",data);
			var tags = data.toLowerCase().match(/#\w+/gi);
			post.setValue("tags",tags!=null?tags:[]);
			var mentions = (data.match(/@\w+/gi)!=null)?data.toLowerCase().match(/@\w+/gi):[];
			mentions.forEach((user)=>{		//checks post for mentions, and notifies users if mentioned in the post
				if(user!=session.name)custom.notifyUser(user, session.name + " mentioned you.","Click to view the post.","/posts/"+id);
			});
			ydb.logEverything("EDITPOST",{id:id, session:session, body:data,realIP:headers["x-real-ip"]});
			if(!approved) {
				console.log(post.getValue());
				custom.notifyUser(session.name,"Post sent for approval","Your post will be displayed only after it has been reviewed.","/posts/"+id,"approve");
				for (var s in ydb.Reference().child("profiles").getValue()){
					//searches for admins, and notifies them ALL
					if(ydb.getUserInformation(s).login==='a') custom.notifyUser(s,"Post needing approval","Please check posts that need approval by clicking on this notification.","/approve","approve");	
				};
			}
			posts = ydb.Reference().child("posts").getValue();		//refreshing posts after saving
			return true;
		} else return false;
	},

	commentPost: (session, id, data)=>{
		data = data.trim();
		if(posts[id] && session && (data&&data.length<config.commentLen)) {
			//ANY logged in user is allowed to comment on a post
			//no editing of comments is allowed yet
			var post = ydb.Reference().child("posts").child(id.toString());
			var timestamp = Date.now().toString();
			//console.log("Comment info: ",id,session,data,new Date());
			if(post.getValue().comments == undefined) {
				post.setValue("comments",{});
			}
			var comment = {
				username:session.name,
				timestamp:timestamp,
				data:data
			}
			mentions = (data&&data.match(/@\w+/gi))?data.match(/@\w+/gi):[];
			mentions.forEach((user)=>{		//checks comments for mentions, and notifies users if mentioned in a comment
				if(user!=session.name)custom.notifyUser(user, session.name + " mentioned you.","Click to view the post.","/posts/"+id+"#"+id+"-"+timestamp);
			});
			post.child("comments").setValue(timestamp,comment);
			ydb.logEverything("COMMENTPOST",{id:id, username:session.name, body:data});
			return true;
		} else return false;
	},

	commentDelete: (session, headers, id, timestamp)=>{
		//console.log(session,posts[id].comments[timestamp]);
		if(session && posts[id] && posts[id].comments[timestamp]) {
			var comm = ydb.Reference().child('posts').child(id.toString()).child('comments').child(timestamp.toString()).getValue();
			//comment deletion can be performed by an admin or the publisher
			//console.log(session,id,timestamp,comm);
			if(ydb.getUserInformation(session.name).login==='a' || comm.username == session.name) {
				ydb.logEverything("COMMENTDELETE",{session:session,id:id,comment:comm,realIP:headers["x-real-ip"]});
				console.log("Comment %s-%s deleted.",id,timestamp);
				return ydb.Reference().child('posts').child(id.toString()).child('comments').deleteNode(timestamp.toString());
			} else return false;
		}else return false;
	},

	//you can add this function to the dashboard of commands
	notifyUser: (username,title,data,link,id)=> {
		//allows to send user a notification...
		//saves the notifications in the user's profile
		if(ydb.getUserInformation(username) && custom.getProfileData(username) && title && data) {
			if(!ydb.Reference().child('profiles').child(username).child('notifications').getValue())
				ydb.Reference().child('profiles').child(username).setValue('notifications',{});
			id = id?id:Date.now().toString();
			ydb.Reference().child('profiles').child(username).child('notifications').setValue(id , {title:title,data:data,link:link});
			ydb.logEverything("NOTIFMAKE" , {username:username,title:title,data:data,link:link});
			return true;
		} else return false;
	},

	getNotifications: (session)=>{
		//allows a logged in user to view their posts
		if(session && ydb.getUserInformation(session.name) && ydb.getUserInformation(session.name))
		return ydb.Reference().child('profiles').child(session.name).child('notifications').getValue();
	},

	clearNotifs: (session,id) => {
		//allows a user to clear their own notifications
		if(session && custom.getProfileData(session.name) && id) {
			ydb.Reference().child('profiles').child(session.name).child('notifications').deleteNode(id.toString());
			//it will delete a notification the user has specified to delete(has viewed)...
			//it's not only simple, but also a good habit to clear notifications
			ydb.logEverything("NOTIFCLEAR" , {username:session.name,id:id});
		}
		return true;
	},

	reportPost: (id,session,headers) => {
		//adds a report flag to a post
		session = session&&session.name?session.name:"anonymous";
		if(posts[id]) {
			ydb.Reference().child('posts').child(id.toString()).setValue("report",session?[session]:[]);
			console.log("Post %s has been reported by %s",id,session);
			for (var s in ydb.Reference().child("profiles").getValue()){
				//searches for admins, and notifies them ALL
				if(ydb.getUserInformation(s).login==='a') custom.notifyUser(s,"Post reported","Please check reported posts by clicking on this notification.","/approve","approve");	
			};
			ydb.logEverything("REPORTPOST",{id:id,session:session,realIP:headers["x-real-ip"]});
			//saves user name that reported the post
		}
	},

	approvePost: (id,session,headers)=>{
		if(posts[id]) {
			ydb.Reference().child('posts').child(id.toString()).setValue("approve",true);
			ydb.Reference().child('posts').child(id.toString()).deleteNode("report");
			ydb.logEverything("POSTAPPROVED",{id:id,session:session,realIP:headers["x-real-ip"]});
			return true;
		} else return false;
	},

	saveMessage: (from,to,message)=>{
		//Creates and uses an IMAP-like mailing tree storage system to save the p2p messages
		if((ydb.getUserInformation(from) && ydb.getUserInformation(to)) && ydb.getUserInformation(from).login==='a' && ydb.getUserInformation(to).login==='a') {
			//the tree first begins with destination nodes(recipients...)(the to value)
			var msgs = ydb.Reference().child('messages');
			if(ydb.Reference().child('messages').child(to).getValue() === undefined) {
				msgs.setValue(to,{});
			}
			//the tree will be reverse mirrored at sender as well
			if(ydb.Reference().child('messages').child(from).getValue() === undefined) {
				msgs.setValue(from,{});
			}
			//next, the tree has deeper sender nodes under each recipient node...
			if(ydb.Reference().child('messages').child(to).child(from).getValue() === undefined) {
				ydb.Reference().child('messages').child(to).setValue(from,{});
			}
			//next, the deeper tree also get reverse mirrored...
			if(ydb.Reference().child('messages').child(from).child(to).getValue() === undefined) {
				ydb.Reference().child('messages').child(from).setValue(to,{});
			}
			ydb.Reference().child('messages').child(from).child(to).setValue(Date.now(), message);	//actually save the message from root to destination
			ydb.Reference().child('messages').child(to).child(from).setValue(Date.now(), message);	//mirror the message at source
		}
	},

	readMessages: (from,to)=>{
		var results=[];
		//Reads and gives an array history of the p2p messages
		if((ydb.getUserInformation(from) && ydb.getUserInformation(to)) && ydb.getUserInformation(from).login==='a' && ydb.getUserInformation(to).login==='a') {
			//the tree first begins with destination nodes(recipients...)(the to value)
			var msgs = ydb.Reference().child('messages');
			if(ydb.Reference().child('messages').child(to).getValue() === undefined) {
				msgs.setValue(to,{});
			}
			//the tree will be reverse mirrored at sender as well
			if(ydb.Reference().child('messages').child(from).getValue() === undefined) {
				msgs.setValue(from,{});
			}
			//next, the tree has deeper sender nodes under each recipient node...
			if(ydb.Reference().child('messages').child(to).child(from).getValue() === undefined) {
				ydb.Reference().child('messages').child(to).setValue(from,{});
			}
			//next, the deeper tree also get reverse mirrored...
			if(ydb.Reference().child('messages').child(from).child(to).getValue() === undefined) {
				ydb.Reference().child('messages').child(from).setValue(to,{});
			}
			var temp = ydb.Reference().child('messages').child(from).child(to).getValue();
			for(var msgs in temp) {
				results.push(temp[msgs]);	//saves the message values...
			}
		}
		return results;
	},

	deleteMessages: (from,to)=>{
		//delete all messages from source to recipient...
		if((ydb.getUserInformation(from) && ydb.getUserInformation(to)) && ydb.getUserInformation(from).login==='a' && ydb.getUserInformation(to).login==='a') {
			return ydb.Reference().child('messages').child(from).deleteNode(to);
		}
	},

	//TODO: add notifications everywhere necessary
	//TODO: Test new file limiting functionality

	sendMail: (id , session , to)=>{
		to = to.match(/\w+@\w+.com/gi);		//checks for, and allows multiple senders
		var post = posts[id];
		var retval=false;
		if((to && to.length>0 && to.length<5) && post && post.file!=undefined) {
			var mailOptions = {
				from: '\"FOCUSA\" <'+config.emailID+'>', // sender address
				to: to, // list of receivers... From req.body.to
				subject: "FOCUSA mail service", // Subject line... From req.body.subj
				text: "FOCUSA has sent you this mail. We personally apologise if this mail has caused you any inconvenience...\n\n"+(post.body?post.body:undefined), // plain text body...
				html: "FOCUSA has sent you this mail.<br><em>We personally apologise if this mail has caused you any inconvenience...</em><br><p>"+(post.body?post.body:undefined)+"</p>", // html body...
				attachments: post.file?[{
					filename:post.file,
					content:require("fs").createReadStream(__dirname+"/docs"+post.file)
				}]:undefined
			};
			// send mail with defined transport object
			transporter.sendMail(mailOptions, (error, info) => {
				if (error) {
					console.log(error);
					custom.notifyUser(session.name,"Mail Failure","Your mail failed to send. Ask the network administrator.","/posts/"+id);
					retval = false;
				} else {
					console.log('Mail sent: %s', JSON.stringify(info));
					custom.notifyUser(session.name,"Mail Sent Successfully","Your mail went through. Please check your mail. Thank You.","#");
					retval = true;
				}
			});
		}
		return retval;
	}
}
return custom;	//return the object with all the functions
}


module.exports = run();