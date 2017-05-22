#!/bin/sh

CONTAINER_BASE_NAME=bcpoc_server
ENVIRONMENT=$1

if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo "Usage: `basename "$0"` [ENVIRONMENT] \
where ENVIRONMENT in (development|staging|production)."
	exit 1
fi

CONTAINER_NAME="$CONTAINER_BASE_NAME"_"$ENVIRONMENT"

if [ "`docker ps -a | grep $CONTAINER_NAME`" ]; then
	docker rm $CONTAINER_NAME
fi

# Link the app dir under /app. The app dir is the parent folder of the script.
# Link the blockchain node under name "blockchain".
# Update the version number here after building an image with a new version number.
docker run -p 4124-4125:4124-4125 \
	-v /`pwd`/..:/app \
	--link buyco_blockchain_$ENVIRONMENT:blockchain \
	--name $CONTAINER_NAME -t -i blockstars/bcpoc_server:1.0.0 bash
