#!/bin/bash

# The entry point for the server container which starts the local
# Node.js server. The web files reside on the host.

echo "Running install..."
sh ./install.sh

echo "Running first Grunt build..."
grunt

echo "Starting grunt serve..."
grunt serve

echo "Command finished. Press enter to continue. To inspect the container, try running "docker exec -ti CONTAINER bash" while it is still running and look around."

# Wait for enter to allow inspecting the running container.
read
