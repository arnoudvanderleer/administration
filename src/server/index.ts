import express, { RequestHandler } from 'express';
import { create as create_handlebars } from 'express-handlebars';
import fileUpload from 'express-fileupload';
import session from 'express-session';
import moment from 'moment';

import connect_db from './database/database';
import FinancialPeriod from './database/FinancialPeriod';

import frontend from './endpoints/frontend';
import api from './endpoints/api';
import models_api from './endpoints/models-api';
import auth from './endpoints/auth';
import bodyParser from 'body-parser';

declare module 'express-session' {
  export interface SessionData {
    financial_period: FinancialPeriod | null;
    user_id : number | null;
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

const check_current: RequestHandler = (req, res, next) => {
    if (!req.session.financial_period?.current) {
        return res.status(400).send("Je kunt geen wijzigingen meer doen in dit boekjaar.");
    }
    next();
};

(async () => {
    const models = await connect_db;

    app.use("/auth", await auth);

    app.use(async (req, res, next) => {
        if (req.session.user_id == null) {
            return res.writeHead(302, {
                'Location': '/auth',
            }).send();
        }
        next();
    });

    app.use(bodyParser.json());

    app.put("/api/financial-period", async (req, res) => {
        let period = await models.FinancialPeriod.findByPk(req.body.id);
        if (!period) return res.status(400).send();
        req.session.financial_period = period;
        res.send();
    });

    app.post('*', check_current)
        .put('*', check_current);

    app.use("/models", await models_api);
    app.use("/api", await api);
    app.use("/", await frontend);

    let port = 8080;
    app.listen(port, () => {
        console.log(`Example app listening on port ${port}`)
    });
})();