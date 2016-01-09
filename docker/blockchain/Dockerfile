FROM ubuntu:14.04
MAINTAINER Aron van Ammers

RUN apt-get update
RUN apt-get install -y curl git build-essential python screen

# Install node 0.12
RUN curl -sL https://deb.nodesource.com/setup_0.12 | sudo bash -
RUN apt-get install -y nodejs

RUN npm install -g embark-framework grunt-cli bower tsd typescript

# Install latest geth
# This command requires input of a 'y'. We adapt the script to comment out the
# line to wait_for_user to prevent that.
# WARNING: This will probably break sometime in the future if the external
# install script is changed. It has worked correctly for geth versions from 1.0
# to 1.3 though.
RUN curl https://install-geth.ethereum.org -L | sed 's/\twait_for_user/\techo "Skipping user confirmation"\n#wait_for_user/g' > installer_geth.sh && bash installer_geth.sh

# Install solidity compiler
# In future versions this might not be necessary anymore if Embark stops
# to depend on the external solc.
RUN apt-get install -y solc

# Generate the DAG for geth mining. This takes a lot of time and hence
# we want to prevent running it on every container run. It does add 1GB
# to the built image, but that is preferrable to our purposes.
RUN mkdir /root/.ethash
RUN geth makedag 0 /root/.ethash

# Create a copy the Embark files to an in-container working directory and
# install it there. Using the mapped host folder would be preferrable, but
# when Embark runs on Linux it requires symlinks. When running Docker on Windows
# with the files on a mapped NTFS volume those can't be created.

# Apparently it is possible to create symlinks on Windows, but only through
# black magic and many headaches. As using containers is meant to avoid exactly
# that, we choose this workaround. The drawback is that for any configuration
# changes of Embark, the image has to be rebuilt instead of just a new
# container being run. As configuration changes to Embark will be rare, that's
# a minor drawback.

# To have the embark files be copied on every container creation/run, comment
# these lines and add the following to docker-entrypoint.sh.
#
# echo "Copying Embark files to local directory..."
# cp -rp /app/docker/blockchain/embark /embark
# cd /embark
# echo "Running install.sh..."
# sh ./install.sh;'

COPY embark /embark
WORKDIR /embark
RUN sh ./install.sh

# The ENTRYPOINT commands are in a separate startup script. We copy the script
# to the container and start it.
COPY ./docker-entrypoint.sh /

WORKDIR /embark

# Just use a bash shell as entry point. Use for debugging purposes to inspect
# the container installation without starting the normal entry point.
#ENTRYPOINT bash

ENTRYPOINT ["/docker-entrypoint.sh"]
