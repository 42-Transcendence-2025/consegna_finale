#!/bin/bash

# Run the app
SERVER_PORT=8080
if [ -z "$1" ]
then
	echo "No port specified, using default port $SERVER_PORT"
else
	SERVER_PORT=$1
fi

# Check if python3 is installed
if command -v python3 &> /dev/null
then
	python3 -m http.server $SERVER_PORT
# Check if python is installed
elif command -v python &> /dev/null
then
	python -m http.server $SERVER_PORT
# Check if ruby is installed
elif command -v ruby &> /dev/null
then
	ruby -run -e httpd . -p $SERVER_PORT
# Check if php is installed
elif command -v php &> /dev/null
then
	php -S 0.0.0.0:$SERVER_PORT
else
	echo "No python, python3, ruby or php found. Please install one of them."
	exit 1
fi