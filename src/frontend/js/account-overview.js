import AccountOverview from "./common/AccountOverview.js";
import { Account } from "./common/api.js";

(async () => {
    let categories = [[], [], [], []];

    for (let account of await Account.get_overview()) {
        let category = Math.floor(account.number / 1000 - 1);
        let amount = ([0, 3].indexOf(category) > -1 ? (-1) : 1) * (parseFloat(account.AccountFinancialPeriods[0].start_amount) + parseFloat(account.amount_sum)) || 0;
        categories[category].push({
            account,
            amount,
            budget: account.AccountFinancialPeriods[0].budget,
        });
    }

    let results = new AccountOverview(false, [{
        header: "Debet",
        edit_enabled: false,
        rows: categories[0],
    }, {
        header: "Credit",
        edit_enabled: false,
        rows: categories[1],
    }]);

    let totals = results.totals();
    categories[3].splice(0, 0, {
        account: { is_bank: false, id: -1, number: 4000, name: 'Eigen Vermogen' },
        amount: totals[0] - totals[1],
        budget: 0,
    });

    let balance = new AccountOverview(false, [{
        header: "Activa",
        edit_enabled: false,
        rows: categories[2],
    }, {
        header: "Passiva",
        edit_enabled: false,
        rows: categories[3],
    }]);

    results.rows.concat(balance.rows).forEach(column => column.forEach(row =>
        row.dom.click(() => {
            if (row.account.id < 0) return;
            window.location.href = `/transaction-overview/${row.account.id}`
        }
        ).addClass("clickable")
    ));

    $(".balance").eq(0).replaceWith(results.dom);
    $(".balance").eq(1).replaceWith(balance.dom);
})();