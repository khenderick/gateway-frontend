#!/bin/bash

POSITIONAL=()
while [[ $# -gt 0 ]]
do
key="$1"

case $key in
    -p|--push)
    PUSH=true
    shift # past argument
    ;;
    *)    # unknown option
    POSITIONAL+=("$1") # save it in an array for later
    shift # past argument
    ;;
esac
done
set -- "${POSITIONAL[@]}" # restore positional parameters

TAGS="$@"
FIRST_TAG=${1:-latest}
LOCAL_TAG=openmotics/frontend:$FIRST_TAG
mv ../../dist.tgz .
docker build -t $LOCAL_TAG .

if [ "${PUSH}" ] ; then
        aws ecr get-login-password | docker login --username AWS --password-stdin $AWS_REGISTRY
fi

for TAG in $TAGS; do
    AWS_TAG=332501093826.dkr.ecr.eu-west-1.amazonaws.com/openmotics/frontend:$TAG
    docker tag $LOCAL_TAG $AWS_TAG
    if [ "${PUSH}" ] ; then
        docker push $AWS_TAG
    fi
done
