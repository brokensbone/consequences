#/bin/bash

docker-compose -f docker-compose.prod.yml build --build-arg network=host
docker-compose -f docker-compose.prod.yml up -d
\
