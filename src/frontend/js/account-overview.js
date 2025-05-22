import { Account } from "./common/api.js";
import { get_factor, make_hash } from "./common/common.js";
import AccountOverview from "./common/AccountOverview.js";
import Chart from '/chart.js/auto/auto.js';
import { render_date, save_hash, load_hash } from "./common/common.js";

let chart = null;

let state = load_hash();

(async () => {
    $("button.reset-date").click(() => {
        set_interval(period_start, new Date(Math.min(period_end, new Date())));
    });

    $("input.from, input.to").change(() => {
        state.interval = {
            from: $("input.from").val(),
            to: $("input.to").val(),
        };
        save_hash(state);
        refresh();
    });

    $("button.previous-month").click(() => {
        let date = new Date($("input.from").val());
        set_month(new Date(date.getFullYear(), date.getMonth() - 1));
    });

    $("button.this-month").click(() => {
        set_month(new Date());
    });

    $("button.next-month").click(() => {
        let date = new Date($("input.from").val());
        set_month(new Date(date.getFullYear(), date.getMonth() + 1));
    });

    if ("from" in (state.interval ?? {}) && "to" in (state.interval ?? {})) {
        set_interval(state.interval.from, state.interval.to);
    } else {
        $("button.reset-date").click();
    }
})();

function set_month(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    set_interval(
        new Date(date.getFullYear(), date.getMonth(), 1, 12, -date.getTimezoneOffset()),
        new Date(date.getFullYear(), date.getMonth() + 1, 0, 12, -date.getTimezoneOffset()),
    );
}

function set_interval(from, to) {
    from = new Date(from).toISOString().substring(0, 10);
    to = new Date(to).toISOString().substring(0, 10);
    $("input.from").val(from);
    $("input.to").val(to).change();
    state.interval = { from, to };
    save_hash(state);
}

async function refresh() {
    if (!$("input.from").get(0).reportValidity() || !$("input.to").get(0).reportValidity()) {
        return;
    }

    let accounts = await fetch_accounts();

    if (!("accounts" in state)) {
        state.accounts = Object.fromEntries(
            accounts.map(a => [a.number, a.id == -1])
        );
        save_hash(state);
    }

    let tables = [[
        { header: "Debet", index: 0 },
        { header: "Credit", index: 1 },
    ], [
        { header: "Activa", index: 2 },
        { header: "Passiva", index: 3 },
    ]].map((columns, i) => {
        let overview = new AccountOverview(
            columns.map(column => ({
                header: column.header,
                rows: accounts.filter(a => a.category == column.index),
            }))
        );
        overview.rows.reduce((a, b) => a.concat(b), []).forEach(row => {
            row.dom.find(".show-graph").prop("checked", state.accounts[row.account.number]);

            row.dom.click(() => {
                let id_part = row.account.id < 0 ? '' : row.account.id + '/';
                window.location.href = `/transaction-overview/${id_part}#${make_hash(state.interval)}`;
            });
        });
        $(".balance").eq(i)
            .replaceWith(
                overview.dom
                .addClass(["result-balance", "balance-balance"][i])
            );
        return overview;
    });

    $(".balance .show-graph")
        .change(() => show_graphs(filter_graphs(tables)))
        .click(e => e.stopPropagation());

    show_graphs(filter_graphs(tables));
}

async function fetch_accounts() {
    let end_date = new Date(state.interval.to);
    end_date.setDate(end_date.getDate() + 1);
    
    let [account_data, end_amounts] = await Promise.all([
        Account.get_overview(state.interval.from),
        Account.get_overview(end_date.toISOString().substring(0, 10))
            .then(end_amounts => Object.fromEntries(
                end_amounts.map(account => [account.id, account.amount])
            )),
    ]);

    let equity_start = 0;
    let equity_end = 0;

    let accounts = account_data.map(account => {
        let id = account.id;
        let number = account.number;
        let category = Math.floor(number / 1000) - 1;
        let factor = get_factor(number);
        let start_amount = parseFloat(account.amount) * factor;
        let end_amount = end_amounts[id] * factor;
        if (category < 2) {
            end_amount -= start_amount;
            start_amount -= start_amount;
        } else {
            equity_start += start_amount * factor;
            equity_end += end_amount * factor;
        }
        return {
            id,
            number,
            category,
            factor,
            start_amount,
            end_amount,
            iban : account.iban,
            name: account.name,
            budget: factor * account.budget,
        };
    });

    let equity_account = {
        id: -1,
        number: 4000,
        category: 3,
        factor: get_factor(4000),
        start_amount: equity_start,
        end_amount: equity_end,
        iban : null,
        name: 'Eigen Vermogen',
        budget: 0,
    };

    accounts.splice(0, 0, equity_account);

    return accounts;
}

function filter_graphs(tables) {
    let rows = tables.map(o => o.rows)
        .reduce((a, b) => a.concat(b), [])
        .reduce((a, b) => a.concat(b), []);

    state.accounts = Object.fromEntries(rows.map(row => [row.account.number, row.dom.find(".show-graph").is(":checked")]));
    save_hash(state);

    return rows.filter(row => state.accounts[row.account.number])
        .map(row => row.account);
}

async function show_graphs(accounts) {
    let canvas = $("canvas.graph").get(0);

    if (accounts.length == 0) {
        return;
    }

    let date_range = get_date_range(state.interval.from, state.interval.to);

    let graphs = await Promise.all(accounts.map(calculate_graph));

    if (chart) {
        chart.destroy();
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
                onClick: (e, a) => {
                    if (a.length == 0) return;

                    let point = a[0];
                    let account = accounts[point.datasetIndex];
                    let moment = date_range[point.index];

                    let from = new Date(moment);
                    from.setDate(from.getDate() - 1);
                    let to = new Date(moment);
                    to.setDate(to.getDate());

                    let interval = { from, to };

                    if (account.id < 0) {
                        window.location = `/transaction-overview/#${btoa(JSON.stringify(interval))}`;
                    } else {
                        window.location = `/transaction-overview/${account.id}/#${btoa(JSON.stringify(interval))}`;
                    }
                }
            },
            data: {
                labels: date_range.map(render_date),
                datasets: graphs,
            },
        }
    );
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

async function calculate_graph(account) {
    let date_range = get_date_range(state.interval.from, state.interval.to);

    let mutations =
        (await Account.get_graph(account.id, state.interval.from, state.interval.to))
            .map(m => ({
                amount: parseFloat(m.amount),
                date: new Date(m.date),
            }));

    let graph = [];

    let total = account.category >= 2 ? account.start_amount : 0;
    let index = 0;
    for (let current of date_range) {
        while (index < mutations.length && mutations[index].date < current) {
            total += account.factor * mutations[index].amount;
            index++;
        }
        graph.push(total);
    }

    return {
        label: account.name,
        data: graph,
    };
}
