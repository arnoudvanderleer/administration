import { Account } from "./common/api.js";
import { get_factor } from "./common/common.js";
import AccountOverview from "./common/AccountOverview.js";
import Chart from '/chart.js/auto/auto.js';
import { render_date } from "./common/common.js";

let chart = null;

(async () => {
    $("input.from").val(period_start.toISOString().substring(0, 10));
    $("input.to").val(period_end.toISOString().substring(0, 10));

    $("input.from, input.to").change(refresh);

    refresh();
})();

async function refresh() {
    let accounts = [];

    let from = $("input.from").val();
    let to = $("input.to").val();

    let date_range = get_date_range(from, to);

    for (let account of await Account.get_overview(from, to)) {
        let factor = get_factor(account.number);
        let start_amount = factor * parseFloat(account.start_amount);
        let category = Math.floor(account.number / 1000) - 1;

        let mutations = account.Mutations.map(m => ({
            change: parseFloat(m.amount),
            date: new Date(m.Transaction.date),
        })).sort((a, b) => a.date - b.date);

        let graph = [];

        let total = [2, 3].indexOf(category) > -1 ? start_amount : 0;
        let index = 0;
        for (let current of date_range) {
            while (index < mutations.length && mutations[index].date < current) {
                total += factor * mutations[index].change;
                index++;
            }
            graph.push({date: current.getTime(), amount: total});
        }

        accounts.push({
            account,
            category, 
            graph,
            budget: account.AccountFinancialPeriods[0].budget,
        });
    }

    let equity_account = { is_bank: false, id: -1, number: 4000, name: 'Eigen Vermogen' };

    accounts.splice(0, 0, {
        account: equity_account,
        category: 3,
        graph: date_range.map((date, i) => ({
            date,
            amount: accounts.map(a => [2, 3].indexOf(a.category) > -1 ? get_factor(a.account.number) * a.graph[i].amount : 0)
                .reduce((a, b) => a + b, 0)
        })),
        budget: 0,
    });

    let tables = [[
        { header: "Debet", index: 0 },
        { header: "Credit", index: 1 },
    ], [
        { header: "Activa", index: 2 },
        { header: "Passiva", index: 3 },
    ]].map((columns, i) => {
        let overview = new AccountOverview(false, 
            columns.map(column => ({
                header: column.header,
                edit_enabled: false,
                rows: accounts.filter(a => a.category == column.index),
            }))
        );
        overview.rows.reduce((a, b) => a.concat(b), []).forEach(row => {
            if (row.account == equity_account) {
                row.dom.find(".show-graph").prop("checked", true);
            }

            row.dom.click(() => {
                if (row.account.id < 0) return;
                window.location.href = `/transaction-overview/${row.account.id}`
            });
        });
        $(".balance").eq(i).replaceWith(overview.dom);
        return overview;
    });

    $(".balance .show-graph")
        .change(() => show_graphs(filter_graphs(tables)))
        .click(e => e.stopPropagation());

    show_graphs(filter_graphs(tables));
}

function get_date_range(from, to) {
    let end = new Date(to);
    end.setDate(end.getDate() + 1);

    let date_range = [];
    for (let current = new Date(from); current <= end; current.setDate(current.getDate() + 1)) {
        date_range.push(new Date(current));
    }
    return date_range;
}

function filter_graphs(tables) {
    return tables.map(o => o.rows)
        .reduce((a, b) => a.concat(b), [])
        .reduce((a, b) => a.concat(b), [])
        .filter(row => row.dom.find(".show-graph").is(":checked"))
        .map(row => ({
            name: row.account.name,
            graph: row.graph,
        }));
}

function show_graphs(accounts) {
    let canvas = $("canvas.graph").get(0);
    if (chart) {
        chart.destroy();
    }
    if (accounts.length == 0) {
        return;
    }
    chart = new Chart(
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
                labels: accounts[0].graph.map(row => render_date(row.date)),
                datasets: accounts.map(account => ({
                    label: account.name,
                    data: account.graph.map(row => row.amount),
                    // borderColor: "#8C694A",
                })),
            },
        }
    );
}
