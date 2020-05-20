#/bin/bash

docker-compose -f docker-compose.live.yml build
docker-compose -f docker-compose.live.yml up -d
\
