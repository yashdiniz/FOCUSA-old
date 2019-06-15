#!/bin/bash
# I have written this script to help quickly generate the SSL/TLS certificates
# author: Yash Diniz
openssl req -new -sha256 -newkey rsa:2048 -nodes -keyout focusa.key -out focusa.csr
openssl x509 -req -days 3650 -in focusa.csr -signkey focusa.key -out focusa.crt.pem

# important files are focusa.enc.key(private key) , focusa.crt(public key)
# below are the secure webSocket certificates required...
openssl dhparam -out dhparam.pem 1024
openssl rsa -in focusa.key -text > privSocket.pem
openssl x509 -inform PEM -in focusa.crt.pem > pubSocket.pem

# focusa.csr is the certificate signing request(not important for end programs)
