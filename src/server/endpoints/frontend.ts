import express from 'express';
var router = express.Router();

export default (async () => {
    router.get('/', (req, res) => res.render("account-overview", {session: req.session}));
    router.get('/period', (req, res) => res.send(JSON.stringify(req.session.financial_period)));
    router.get('/upload-transactions', (req, res) => res.render("upload-transactions", {session: req.session}));
    router.get('/process-transactions', (req, res) => res.render("process-transactions", {session: req.session}));
    router.get('/accounts', (req, res) => res.render("accounts", {session: req.session}));
    router.get('/account-overview', (req, res) => res.render("account-overview", {session: req.session}));
    router.get('/transaction-overview', (req, res) => res.render("transaction-overview", {session: req.session}));
    router.get('/transaction-overview/:id', (req, res) => res.render("transaction-overview", {id : req.params.id, session: req.session}));
    router.get('/financial-periods', (req, res) => res.render("financial-periods", {session: req.session}));

    router.use('/jquery', express.static('node_modules/jquery/dist'));
    router.use('/selectize', express.static('node_modules/@selectize/selectize/dist'));
    router.use('/', express.static('frontend'));
    return router;
})();