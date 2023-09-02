#! /bin/sh
npx sequelize-cli db:migrate --config ./migrations/config.json --migrations-path ./migrations/

if [ "$NODE_ENV" = development ]; then
    npm run dev
else
    npm run start
fi