import Balance from "./Balance.js";
import { clone_template, render_date } from "./common.js";

export default class Transaction {
    constructor(transaction, editable) {
        this.dom = clone_template('template.transaction');
        this.transaction = transaction;
        this.editable = editable;

        this.populate();
    }

    set editable(editable) {
        if (!this.transaction.BankTransaction) {
            if (this._editable) {
                this.transaction.date = this.dom.find(".date").val();
            }
            this.dom.find(".date").replaceWith(editable
                ? $(`<input type="date" class="date" />`).val(new Date(this.transaction.date).toISOString().substring(0, 10))
                : $(`<span class="date">${render_date(this.transaction.date)}</span>`)
            );
        }

        if (this.balance) {
            this.balance.editable = editable;
        }

        this.dom.find(".description").attr({contenteditable: editable ? "plaintext-only" : false});
        this._editable = editable;
    }

    populate() {
        this.dom.find(".date").text(render_date(this.transaction.date));
        let bank_transaction = this.transaction.BankTransaction;
        if (bank_transaction && (bank_transaction.other_account != "")) {
            this.dom.find(".bank-transaction").text(
                bank_transaction.is_credit ?
                    `Van ${bank_transaction.other_account} (${bank_transaction.other_account_name}) naar ${bank_transaction.this_account}.` :
                    `Van ${bank_transaction.this_account} naar ${bank_transaction.other_account} (${bank_transaction.other_account_name}).`
            );
        }
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
