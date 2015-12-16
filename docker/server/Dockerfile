FROM ubuntu:14.04
MAINTAINER Aron van Ammers

RUN apt-get update
RUN apt-get install -y \
	curl \
	git \
	# python \
	screen

# Install node 0.12
RUN curl -sL https://deb.nodesource.com/setup_0.12 | sudo bash -
RUN apt-get install -y nodejs

RUN npm install -g grunt-cli bower tsd typescript

WORKDIR /app

# The ENTRYPOINT commands are in a separate startup script. We copy the script
# to the container and start it.
COPY ./docker-entrypoint.sh /

# Just use a bash shell as entry point. Use for debugging purposes to inspect
# the container installation without starting the normal entry point.
# ENTRYPOINT bash

ENTRYPOINT [ "/docker-entrypoint.sh"]
