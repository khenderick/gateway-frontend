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

VERSION=${1:-latest}
TAG=openmotics/frontend:$VERSION
AWS_TAG=332501093826.dkr.ecr.eu-west-1.amazonaws.com/$TAG

(cd ../../../../frontend && tar czf dist.tgz dist)
mv ../../../../frontend/dist.tgz .
docker build -t $TAG .
docker tag $TAG $AWS_TAG
if [ "${PUSH}" ] ; then
	docker push $AWS_TAG
fi
rm dist.tgz