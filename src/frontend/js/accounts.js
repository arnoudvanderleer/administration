import { clone_template } from "./common/common.js";

let tbody = $('table.data tbody');

load(tbody);

let save_new = () => {
    let row = $("table.data tfoot tr");
    let data = {
        number : row.find(".number").val(),
        name : row.find(".name").val(),
    };
    add_account(data, result => {
        add_row(tbody, result);
        row.find("input").val("");
    });
}

$("table.data tfoot .add").click(save_new);

$("table.data tfoot input").keydown(e => {
    if (e.which == 13) {
        save_new();
    }
});

function add_row(tbody, data, place) {
    let row = clone_template(".data-row");
    row.find(".number").text(data.number);
    row.find(".name").text(data.name);
    row.find(".edit").click(() => edit_row(data.id, row));
    row.find(".delete").click(() => delete_account(data.id, () => row.remove()));

    if (place == null) {
        tbody.append(row);
    } else {
        place.replaceWith(row);
    }
}

function edit_row(id, row) {
    let form_row = clone_template(".edit-row");
    form_row.find(".number").val(row.find(".number").text());
    form_row.find(".name").val(row.find(".name").text());
    row.replaceWith(form_row);
    let save = () => {
        let data = {
            number : form_row.find(".number").val(),
            name : form_row.find(".name").val(),
        };
        update_account(id, data, () => add_row(null, {...data, id}, form_row));
    }
    form_row.find(".save").click(save);
    form_row.find("input").keydown(e => {
        if (e.which == 13) {
            save();
        }
    });
}

function load(tbody) {
    $.getJSON("/models/account", data => {
        tbody.empty();
        data.forEach(d => add_row(tbody, d));
    });
}

function add_account(data, success) {
    $.ajax({
        type: "POST",
        url: "/models/account",
        dataType : "json",
        data,
        success,
    });
}

function update_account(id, data, success) {
    $.ajax({
        type: "PUT",
        url: "/models/account/" + id,
        data,
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