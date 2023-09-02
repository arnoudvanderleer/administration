import { clone_template, render } from "./common/common.js";

load();

let save_new = () => {
    let row = $("table.data tfoot tr");
    let data = {
        number : row.find(".number").val(),
        name : row.find(".name").val(),
        AccountFinancialPeriods: [{
            FinancialPeriodId: current_financial_period,
            start_amount: parseFloat(row.find(".start-amount").val()),
            budget: parseFloat(row.find(".budget").val()),
        }],
    };
    add_account(data, result => {
        add_row(result);
        row.find("input").val("");
    });
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
    row.find(".start-amount").text(account.AccountFinancialPeriods.length > 0 ? render(account.AccountFinancialPeriods[0].start_amount) : "");
    row.find(".budget").text(account.AccountFinancialPeriods.length > 0 ? render(account.AccountFinancialPeriods[0].budget) : "");
    row.find(".edit").click(() => edit_row(account.id, row));
    row.find(".delete").click(() => delete_account(account.id, () => row.remove()));

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
    let save = () => {
        let data = {
            number : form_row.find(".number").val(),
            name : form_row.find(".name").val(),
            AccountFinancialPeriods: form_row.find(".enabled").is(":checked") ? [{
                FinancialPeriodId: current_financial_period,
                start_amount: parseFloat(form_row.find(".start-amount").val()),
                budget: parseFloat(form_row.find(".budget").val()),
            }] : []
        };
        update_account(id, data, () => add_row({...data, id}, form_row));
    }
    form_row.find(".save").click(save);
    form_row.find("input").keydown(e => {
        if (e.which == 13) {
            save();
        }
    });
}

async function load() {
    let accounts = await $.getJSON("/models/account");
    $("table.data tbody").empty();
    accounts.forEach(a => add_row(a));
}

function add_account(data, success) {
    $.ajax({
        type: "POST",
        url: "/models/account",
        contentType : "application/json",
        data: JSON.stringify(data),
        success,
    });
}

function update_account(id, data, success) {
    $.ajax({
        type: "PUT",
        url: "/models/account/" + id,
        contentType : "application/json",
        data: JSON.stringify(data),
        success,
    });
}

function delete_account(id, success) {
    $.ajax({
        type: "DELETE",
        url: "/models/account/" + id,
        success,
    });
}