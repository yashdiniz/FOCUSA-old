# FOCUSA v3.0.0

> This repository is now archived.

> This was the very first project I had ever endeavoured to do. The adventure did bring me quite far, and I am happy with progress. However, kindly
> forgive any mistakes or immature programming decisions that may be documented here. I know this project contains a Gargantua of maintenance issues,
> and will take a long time to fix and update.

First of all, I would like to welcome you to FOCUSA! This product is a Learning Management System that is simple, interactive, and helpful!
Okay, so first things first, here are the **assumptions** I've made throughout this tutorial.

*	You are currently in the root directory of the project. I shall signify the "project root directory" by using the forward slash symbol(/).
*	You have opened terminal, and your current working directory in the terminal is the root directory of the project.
	(if not, then use the `cd` command to traverse into the project root directory)
*	You are aware of and have knowledge about technologies like nginx and nodejs, and can atleast perform basic operations with them.

## Steps to set up FOCUSA on a new system(Linux):

1.	Extract and the open the project's root directory. Also open a terminal at the project's root directory.

2.	In terminal, type the command `cd certs/; sudo ./GenerateCertificates.sh`. This shell script will help create SSL certificates for
	HTTPS support in FOCUSA.

3.	Fill up the details that get asked to you. These details will be used to create a self-signed SSL certificate. 
	You do not need to fill up Optional company name, email, or challenge password.
	You need to, however compulsorily fill up correct values for country, state, city, and organisation fields.
	`NOTE:` If you are using a certificate offered by an official Certificate Authority, you can take the certificates offered by them,
	And rename them.
	Private certificate: focusa.key,
	Public certificate: focusa.crt.pem

4.	Connect yourself to the Internet, and then type the command based on your distro
	(in Debian, it's `sudo apt-get install nodejs nginx`)
	This command will help install Node.JS interpreter and NGINX proxy server into the system.

5.	Modify the `focusaNGINX.conf`(in the project root directory) file very carefully, and change the root directory of the project to 
	'./docs'(but you need to put the absolute path)

6.	Modify the `config.json` file's `currentServerURL` attribute very carefully, to the current server's IP address or domain name. Note
	that you can add pattern matching and/or regular expressions in this field as well.

7.	Open a terminal at the project's root directory, and type in the command `npm install`. This will install all the nodeJS dependencies 
	needed by FOCUSA to make the system run effectively.

8.	(Optional)Reinitialise YDB by opening a node REPL terminal and typing the command 
	```javascript
		> var ydb = (require("./ydb/ydb.js"))("initialize");
	```

9.	Finally, you can start FOCUSA. You need to type the command `sudo ./server.sh` in the terminal, which starts FOCUSA. if any error occurs,
	please check the error, and inform me, otherwise fix the bugs accordingly.

## Steps to perform very risky jobs of FOCUSA(an Intro to YDB)

An informative tip: If you have good knowledge about JavaScript or Node.js as a programming language, then you can also try playing
around with YDB(FOCUSA's unique, simple and secure database). YDB's security lies around the fact that most of the fragile database
operations are only available directly through the terminal, without any external form of contact. This means the network admin or
sysadmin needs to have basic knowledge of how to connect to YDB, and use it to it's full potential for efficient system management.

1.	First of all, you need to open node. This can be done by typing the following command in the root directory of FOCUSA.
	```bash
		$ node
	```
2.	Next, you will be welcomed by the node REPL terminal. You need to type in the following command in the REPL:
	```javascript
		> var ydb = new (require("./ydb/ydb.js"))();
		//NOTE: Remember to add the parentheses and semicolon at the end of this command...
	```
3.	After this command executes, you can type `ydb. ` and press the TAB key to explore the various functions and operations
	supported by the database.

The most notable functions are `clearLogs();` and `clearSessions()` which need to be performed one after another if you ever wish to clear
the FOCUSA cache. Other notable functions include the same/similar functions as provided on FOCUSA dashboard, and a the `Reference()` object.

The `Reference()` object is the heart of YDB, and it actually offers real flexibility and allows users to create, traverse, update, and delete
nodes in a JSON object tree. This object supports method chainingas well. It contains the following instructions:
*	`getRoot()` - Sets the pointer back to root node of the database. Returns a Reference object to the root node.

*	`child(node_key)` - Sets the pointer to a node adjacent to the current node, whose key matches. Returns a Reference object to the child
	node.

*	`setValue(node, value)` – Creates a new node under the current node, and feeds value into that node. The value can be of any data type
	supported by JavaScript. It is noteworthy that value can be another JSON object as well, which can be further traversed by using the
	child function. Also, value can include arrays, functions, and even Strings. Returns a Reference to current node, NOT to newly added
	node.
*	`getValue()` - Gets the value of ALL the nodes(objects) UNDER the current node(not inclusive of current node). Since the value returned
	by this function is not a Reference, this function normally terminates a method chain.
	An example of usage of Reference() object could be as follows:
*	To create a tree that stores student details:
	```javascript
		ref = ydb.Reference().setValue(“students”,{}); //creates a node called students
	```
*	To save data to students tree(assuming table is already created):
	```javascript
		ref = ydb.Reference().child(“students”).setValue(“1” , {name:’Yash’ , age:’15’});
	```
*	To retrieve all the student data:
	```javascript
		data = ydb.Reference().child(“students”).getValue(); //returns all students data
	```
