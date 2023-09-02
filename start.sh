#! /bin/bash

docker volume create accountant-db

# docker compose up -d --force-recreate --build
/opt/google/chrome/google-chrome "http://localhost:8080" > /dev/null 2>&1
# docker compose up --force-recreate --build
docker compose up --build
# docker compose up
