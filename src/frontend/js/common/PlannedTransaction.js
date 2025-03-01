import { Transaction } from "./api.js";
import Balance from "./Balance.js";
import { clone_template, render_date } from "./common.js";

let render_period_unit = u => ({'day': 'dagen', 'week': 'weken', 'month' : 'maanden'})[u];

export default class PlannedTransaction {
    constructor(transaction, editable) {
        this.dom = clone_template('template.planned-transaction');
        this.transaction = transaction;
        this.editable = editable;

        this.populate();
    }

    set editable(editable) {
        if (this._editable) {
            this.transaction.date = this.dom.find(".date").val();
        }

        let inputs = [
            {
                class: "date",
                value: new Date(this.transaction.date).toISOString().substring(0, 10),
                render: render_date(this.transaction.date),
                element: `<input type="date" />`
            },
            {
                class: "period",
                value: this.transaction.period,
                render: this.transaction.period,
                element: `<input type="number" min="0" />`
            },
            {
                class: "period-unit",
                value: this.transaction.periodUnit,
                render: render_period_unit(this.transaction.periodUnit),
                element: `<select><option value="day">dagen</option><option value="week">weken</option><option value="month">maanden</option></select>`
            },
        ];

        for (let {class: c, value, render, element} of inputs) {
            let new_element = editable ? $(element).val(value) : $(`<span>${render}</span>`);
            new_element.addClass(c);
            this.dom.find("." + c).replaceWith(new_element);
        }

        if (this.balance) {
            this.balance.editable = editable;
        }

        this.dom.find(".description").attr({contenteditable: editable ? "plaintext-only" : false});
        this._editable = editable;
    }

    populate() {
        this.dom.find(".description").text(this.transaction.description);

        let mutations = [[], []];

        for (let m of this.transaction.Mutations) {
            mutations[m.amount > 0 ? 1 : 0].push({
                account: m.Account,
                amount: m.amount,
            });
        }

        this.balance = new Balance(this._editable, [
            {
                header: "Debet",
                edit_enabled: !this.transaction.BankTransaction || this.transaction.BankTransaction.is_credit,
                rows: mutations[0],
            },
            {
                header: "Credit",
                edit_enabled: !this.transaction.BankTransaction || !this.transaction.BankTransaction.is_credit,
                rows: mutations[1],
            }
        ]);

        this.dom.append(this.balance.dom);
    }
}
