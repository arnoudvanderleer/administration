import AccountOverview from "./common/AccountOverview.js";
import { Account } from "./common/api.js";

(async () => {
    let categories = [[], [], [], []];

    for (let account of await Account.get_overview()) {
        let category = Math.floor(account.number / 1000 - 1);
        let amount = ([0, 3].indexOf(category) > -1 ? (-1) : 1) * (parseFloat(account.AccountFinancialPeriods[0].start_amount) + (parseFloat(account.amount_sum) || 0));
        categories[category].push({
            account,
            amount,
            budget: account.AccountFinancialPeriods[0].budget,
        });
    }

    categories[3].splice(0, 0, {
        account: { is_bank: false, id: -1, number: 4000, name: 'Eigen Vermogen' },
        amount: categories[2].map(a => a.amount).concat(categories[3].map(a => -a.amount)).reduce((a, b) => a + b, 0),
        budget: 0,
    });

    [[
        { header: "Debet", index: 0 },
        { header: "Credit", index: 1 },
    ], [
        { header: "Activa", index: 2 },
        { header: "Passiva", index: 3 },
    ]].forEach((columns, i) => {
        let overview = new AccountOverview(false, 
            columns.map(column => ({
                header: column.header,
                edit_enabled: false,
                rows: categories[column.index],
            }))
        );
        overview.rows.forEach(column => column.forEach(row =>
            row.dom.click(() => {
                if (row.account.id < 0) return;
                window.location.href = `/transaction-overview/${row.account.id}`
            }
            ).addClass("clickable")
        ));
        $(".balance").eq(i).replaceWith(overview.dom);
    });
})();