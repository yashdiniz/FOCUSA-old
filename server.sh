#!/bin/bash
#Server execution shell script for FOCUSA
#author: @yash.diniz;
reset;
echo "Welcome!"
echo "Please make sure FOCUSA is properly configured if you see any errors."
echo "Config file is config.json, in the root directory of the project."
echo;
echo "To start the server along with the nginx proxy addon, you can type the command:"
echo "	./server.sh with-proxy"
if expr match $1 "with-proxy"
then	sudo cp ./focusaNGINX.conf /etc/nginx/sites-available;
        sudo ln -s /etc/nginx/sites-available/focusaNGINX.conf /etc/nginx/sites-enabled/;
	sudo service nginx restart;
	sleep 1;
else	sudo service nginx stop;
	sleep 5;
fi;
clear;
# condition above used to start the proxy server, in case proxying is required(FOCUSA needs to be configured as well!)

#starting node...
node server.js;

sleep 1;
