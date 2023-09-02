FROM node:latest as base

WORKDIR /home/node/app

COPY package*.json ./

RUN npm i

COPY . .

ENTRYPOINT [ "./startup.sh" ]

FROM base as production

ENV NODE_PATH=./build

RUN npm run build