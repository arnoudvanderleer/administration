import { clone_template, render, get_factor } from "./common/common.js";
import { Account } from "./common/api.js";

load();

let save_new = async () => {
    let row = $("table.data tfoot tr");
    let number = row.find(".number").val();
    let data = {
        number,
        name : row.find(".name").val(),
        AccountFinancialPeriods: [{
            FinancialPeriodId: current_financial_period,
            start_amount: get_factor(number) * parseFloat(row.find(".start-amount").val()),
            budget: get_factor(number) * parseFloat(row.find(".budget").val()),
        }],
    };
    add_row(await Account.add(data));
    row.find("input").val("");
}

$("table.data tfoot .add").click(save_new);

$("table.data tfoot input").keydown(e => {
    if (e.which == 13) {
        save_new();
    }
});

function add_row(account, place) {
    let row = clone_template(".data-row");
    row.find(".enabled").prop("checked", account.AccountFinancialPeriods.length > 0);
    row.find(".number").text(account.number);
    row.find(".name").text(account.name);
    row.find(".start-amount").text(account.AccountFinancialPeriods.length > 0 ? render(get_factor(account.number) * account.AccountFinancialPeriods[0].start_amount) : "");
    row.find(".budget").text(account.AccountFinancialPeriods.length > 0 ? render(get_factor(account.number) * account.AccountFinancialPeriods[0].budget) : "");
    row.find(".edit").click(() => edit_row(account.id, row));
    row.find(".delete").click(async () => {
        await Account.delete(account.id);
        row.remove();
    });

    if (place == null) {
        $("table.data tbody").append(row);
    } else {
        place.replaceWith(row);
    }
}

function edit_row(id, row) {
    let form_row = clone_template(".edit-row");
    for (let field of [".number", ".name", ".start-amount", ".budget"]) {
        form_row.find(field).val(row.find(field).text());
    }
    form_row.find(".enabled").prop("checked", row.find(".enabled").is(":checked"));
    row.replaceWith(form_row);
    let save = async () => {
        let number = form_row.find(".number").val();
        let data = {
            number,
            name : form_row.find(".name").val(),
            AccountFinancialPeriods: form_row.find(".enabled").is(":checked") ? [{
                FinancialPeriodId: current_financial_period,
                start_amount: get_factor(number) * parseFloat(form_row.find(".start-amount").val()) || 0,
                budget: get_factor(number) * parseFloat(form_row.find(".budget").val()) || 0,
            }] : []
        };
        await Account.update(id, data);
        add_row({...data, id}, form_row);
    }
    form_row.find(".save").click(save);
    form_row.find("input").keydown(e => {
        if (e.which == 13) {
            save();
        }
    });
}

async function load() {
    let accounts = await Account.get_all();
    $("table.data tbody").empty();
    accounts.forEach(a => add_row(a));
}
