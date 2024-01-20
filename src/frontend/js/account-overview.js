import { Account } from "./common/api.js";
import { get_factor } from "./common/common.js";
import AccountOverview from "./common/AccountOverview.js";
import Chart from '/chart.js/auto/auto.js';
import { render_date } from "./common/common.js";

(async () => {
    let start_equity = fill_balances();

    fill_graph(start_equity);
})();

async function fill_balances() {
    let categories = [[], [], [], []];

    for (let account of await Account.get_overview()) {
        let category = Math.floor(account.number / 1000 - 1);
        let amount = get_factor(account.number) * (parseFloat(account.AccountFinancialPeriods[0].start_amount) + (parseFloat(account.amount_sum) || 0));
        categories[category].push({
            account,
            amount,
            start_amount: parseFloat(account.AccountFinancialPeriods[0].start_amount),
            budget: account.AccountFinancialPeriods[0].budget,
        });
    }

    let equity = categories[2].concat(categories[3]).map(a => a.start_amount).reduce((a, b) => a + b, 0);

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

    return equity;
}

async function fill_graph(start_equity) {
    let data = (await Account.get_graph()).map(d => ({
        ...d,
        date: new Date(d.date),
    }));
    let end = Math.min(new Date(), period_end);
    let graph = [];
    let total = await start_equity;
    let index = 0;
    for (let current = new Date(period_start); current <= end; current.setDate(current.getDate() + 1)) {
        if (index < data.length && data[index].date <= current) {
            total += parseFloat(data[index].change);
            index++;
        }
        graph.push({date: current.getTime(), amount: total});
    }
    let canvas = $("canvas.graph").get(0);
    new Chart(
        canvas,
        {
            type: 'line',
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        ticks: {
                            callback: value => `€ ${value}`
                        },
                    },
                },
            },
            data: {
                labels: graph.map(row => render_date(row.date)),
                datasets: [
                    {
                        label: 'Eigen vermogen',
                        data: graph.map(row => row.amount),
                        borderColor: "#8C694A",
                    }
                ]
            },
        }
    );
}
