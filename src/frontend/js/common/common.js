import { Account } from "./api.js";

export const get_account_select = (() => {
    let bank_accounts_select_template = document.querySelector('template.bank-accounts').content.firstElementChild;
    let non_bank_accounts_select_template = document.querySelector('template.non-bank-accounts').content.firstElementChild;
    let selects_promise = new Promise(async resolve => {
        (await Account.get_all()).forEach(a =>
            $("<option></option>")
                .text(`${a.number}: ${a.name}`)
                .attr("value", a.id)
                .appendTo(a.iban ? bank_accounts_select_template : non_bank_accounts_select_template)
        );
        resolve();
    });
    return async iban => {
        await selects_promise;
        return clone_template(`template.${iban ? "" : "non-"}bank-accounts`);
    }
})();

export function clone_template(selector) {
    return $(document.querySelector(selector).content.children).clone(true);
}

export function render(value, abs) {
    if (abs == true) {
        value = Math.abs(value);
    }
    return parseFloat(value).toFixed(2);
}

export function render_date(date) {
    return new Date(date).toDateString().substring(4);
}

export function render_iban(iban) {
    return iban ? iban.replace(/(.{4})/g, "$1 ").trim() : "";
}

export function get_factor(number) {
    let category = Math.floor(number / 1000 - 1);
    return ([0, 3].indexOf(category) > -1 ? (-1) : 1);
}

export function make_hash(data) {
    return btoa(JSON.stringify(data));
}

export function save_hash(data) {
    window.location.hash = make_hash(data);
}

export function load_hash() {
    try {
        return JSON.parse(atob(window.location.hash.substring(1)));
    }
    catch {
        return {};
    }
}
