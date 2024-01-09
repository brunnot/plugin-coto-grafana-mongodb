#!/bin/bash

ENV=-none
IMAGE_NAME="plugin-coto-rest-mongodb"

CONTAINER_REPO="ghcr.io/brunnot/plugin-coto-grafana-mongodb"

while [[ ${ENV} != "local" ]] && [[ ${ENV} != "prod" ]]
do
  read -p "Choose the environment (local, prod): " t_env
  ENV=${t_env:-none}
done

VERSION_CONFIRM=none
VERSION=`grep -oPm1 '(?<=("version": "))[^",]+' "package.json"`

echo "-------------------------------"
echo "Versão: " $VERSION
echo "-------------------------------"

while [[ ${VERSION_CONFIRM} != "n" ]] && [[ ${VERSION_CONFIRM} != "y" ]]
do
  read -p "A versão está correta ? (y/n): " t_env
  VERSION_CONFIRM=${t_env:-none}
done

if [[ ${VERSION_CONFIRM} = "n" ]]
then
  echo "ERRO: Corrigir a versão no package.json antes de continar !"
  exit
fi

echo 'Efetuando o build do plugin...'

docker build -t $CONTAINER_REPO/$IMAGE_NAME:latest \
			       -t $CONTAINER_REPO/$IMAGE_NAME:$VERSION . --network=host

if [ "$ENV" = "prod" ]
then
	echo '----'
	echo 'Efetuando o push das imagens. ( Importante: esteja autenticado no GitHub )'
	echo '----'

    docker push $CONTAINER_REPO/$IMAGE_NAME:latest
    docker push $CONTAINER_REPO/$IMAGE_NAME:$VERSION
fi
