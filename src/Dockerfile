FROM node:latest as base

RUN apt-get update && apt-get -y install postgresql

WORKDIR /home/node/app

COPY package*.json ./

RUN npm i

COPY . .

ENTRYPOINT [ "./startup.sh" ]

FROM base as production

ENV NODE_PATH=./build

RUN npm run build