import express from 'express';
import connect_db from '../database/database';
var router = express.Router();

export default (async () => {
    router.get('/',                         async (req, res) => res.render("account-overview",          await make_handlebars_data(req)));
    router.get('/account-overview',         async (req, res) => res.render("account-overview",          await make_handlebars_data(req)));
    router.get('/accounts',                 async (req, res) => res.render("accounts",                  await make_handlebars_data(req)));
    router.get('/financial-periods',        async (req, res) => res.render("financial-periods",         await make_handlebars_data(req)));
    router.get('/close-financial-period',   async (req, res) => res.render("close-financial-period",    await make_handlebars_data(req)));
    router.get('/process-transactions',     async (req, res) => res.render("process-transactions",      await make_handlebars_data(req)));
    router.get('/add-transaction',          async (req, res) => res.render("add-transaction",           await make_handlebars_data(req)));
    router.get('/upload-transactions',      async (req, res) => res.render("upload-transactions",       await make_handlebars_data(req)));
    router.get('/transaction-overview',     async (req, res) => res.render("transaction-overview",      await make_handlebars_data(req)));
    router.get('/transaction-overview/:id', async (req, res) => res.render("transaction-overview",      await make_handlebars_data(req, {id : req.params.id})));
    router.get('/planned-transactions',     async (req, res) => res.render("planned-transactions",      await make_handlebars_data(req)));
    router.get('/add-planned-transaction',  async (req, res) => res.render("add-planned-transaction",   await make_handlebars_data(req)));

    router.get('/period', (req, res) => res.send(JSON.stringify(req.session.financial_period)));

    router.use('/jquery', express.static('node_modules/jquery/dist'));
    router.use('/selectize', express.static('node_modules/@selectize/selectize/dist'));
    router.use('/chart.js', express.static('node_modules/chart.js'));
    router.use('/@kurkle', express.static('node_modules/@kurkle'));
    router.use('/', express.static('frontend'));
    return router;
})();

async function make_handlebars_data(request: express.Request, additional_data={}) {
    const models = await connect_db;

    let user = await models.User.findByPk(request.session.user_id ?? 0);
    let backup_needed = !user || !user.last_backup || (new Date().getTime() - user.last_backup.getTime()) > 1000 * 60 * 60 * 12;

    return {
        session: request.session,
        backup_needed,
        ...additional_data,
    };
}
