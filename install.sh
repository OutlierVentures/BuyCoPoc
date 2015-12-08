#!/bin/sh

# This script runs all the install steps required for the app to run.

npm install
tsd install

cd client
bower install --config.interactive=false --allow-root
tsd install 
