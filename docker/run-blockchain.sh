#!/bin/sh

CONTAINER_BASE_NAME=bcpoc_blockchain
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

# Update the version number here after building an image with a new version number.
docker run -p 9101:9101 -p 9001:9001 -p 9002:9002 \
	-e "BCPOC_ENVIRONMENT=$ENVIRONMENT" \
 	-v /`pwd`/../../buyco_blockchain_data:/blockchain \
	--name $CONTAINER_NAME -t -i blockstars/bcpoc_blockchain:1.0.0 bash
