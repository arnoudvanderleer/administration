FROM node:latest as base

RUN apt-get update
RUN apt-get -y install postgresql-common
RUN echo | /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
RUN apt-get -y install postgresql-client-17

WORKDIR /home/node/app

COPY package*.json ./

RUN npm i

COPY . .

ENTRYPOINT [ "./startup.sh" ]

FROM base as production

ENV NODE_PATH=./build

RUN npm run build