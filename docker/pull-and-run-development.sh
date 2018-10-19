#!/bin/sh

echo Doing a fresh deploy of development: git pull, run server
cd ..
# Grunt inject changes index.html locally. Revert it so git doesn't complain about that.
git checkout client/index.html
git pull
cd docker
bash ./run-server.sh development
