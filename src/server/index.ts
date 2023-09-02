import express from 'express';
import { create as create_handlebars } from 'express-handlebars';
import fileUpload from 'express-fileupload';
import session from 'express-session';
import moment from 'moment';

import connect_db from './database/database';
import FinancialPeriod from './database/FinancialPeriod';

import frontend from './endpoints/frontend';
import api from './endpoints/api';
import models_api from './endpoints/models-api';

declare module 'express-session' {
  export interface SessionData {
    financial_period: FinancialPeriod;
  }
}

const app = express();

const handlebars = create_handlebars({
    defaultLayout: "main",
    helpers: {
        section: function (name: string, options: any) {
            if (!this._sections) this._sections = {};
            (this._sections as { [key: string]: any })[name] = options.fn(this);
            return null;
        }, 
        moment: function (date: Date, pattern: string) {
            return moment(date).format(pattern);
        },
    },
});

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
app.set('views', './views');

app.use(session({
    secret: (process.env.SECRET as string),
    resave: true,
    saveUninitialized: false,
}));
app.use(fileUpload());


(async () => {
    const models = await connect_db;

    app.use(async (req, _, next) => {
        if (!req.session.financial_period) {
            req.session.financial_period = (await models.FinancialPeriod.findOne({
                raw: true,
                order: [['start_date', 'DESC']]
            }) as FinancialPeriod);
        }
        next();
    });

    app.use("/models", await models_api);
    app.use("/api", await api);
    app.use("/", await frontend);

    let port = 8080;
    app.listen(port, () => {
        console.log(`Example app listening on port ${port}`)
    });
})();