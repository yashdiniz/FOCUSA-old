/*
	@author: yash.diniz;
	This code is used to run the project on a cluster server.
	The cluster server can be a multi-core processor server,
	BUT it SHOULD be using a single storage!! (harddrive)
*/
var cluster = require("cluster");
workers = [];

function startWorker (argument) {
	var worker = cluster.fork();
	console.log("Clusters were an old implementation of multi-core code that I wished to test with nodeJS..." +
			"(It is preferred not to run this yet)");
	console.log("CLUSTER-SERVER: A new server instance with id %d has been started on the processor of this workstation." , worker.id);
	//console.log("If you want to exit now, it's recommended to restart your system.");
	return worker;
};

if (cluster.isMaster) {
	/*require("os").cpus().forEach(function(){
		workers.push(startWorker());		//start a new server on each processor
	});*/
	startWorker();

	//If a server crashes, the worker will exit. 
	//This code below will detect the failure, and will quickly replace the lost worker
	//with a new worker.
	cluster.on('disconnect' , function(worker){
		console.log("CLUSTER-SERVER: Worker %d disconnected from the cluster." , worker.id);
	});
	cluster.on('exit' , function (worker , code , signal) {
		console.log("CLUSTER-SERVER: Worker %d died with exit code %d(%s)" , worker.id , code , signal);
		//spawning a new worker on failure of the former...
		startWorker();
	});
}else{
	require(__dirname+'/server.js');
}
