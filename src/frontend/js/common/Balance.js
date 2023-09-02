import { get_account_select, clone_template, render } from "./common.js";

export default class Balance {
    /**
     * @param {boolean} editable 
     * @param { {
     *      header: string,
     *      edit_enabled: boolean,
     *      rows: {
     *          account: {
     *              is_bank: boolean
     *          } & ({name: string, number: int} | {id: int}),
     *          amount: int,
     *      }[]
     * } [] } column_data
     */
    constructor(editable, column_data) {
        this.dom = clone_template("template.balance");
        this._editable = editable;

        this.rows = [[], []];
        this.valid = false;
        this.valid_rows = [];
        this.invalid_rows = [];

        this.column_data = column_data;
        this.populate();
    }

    set editable(editable) {
        if (editable == this._editable) return;
        this._editable = editable;
        
        this.rows.forEach(column => column.forEach(row => row.editable = editable));
        this.update();
    }

    populate() {
        for (let i = 0; i < 2; i++) {
            for (let row of this.column_data[i].rows) {
                this.add_row(row, i);
            }
        }
        this.dom.find(".header").each((i, el) => $(el).text(this.column_data[i].header));
        this.dom.find(".accounts").each((i, el) => $(el).append(this.rows[i].map(r => r.dom)));
        this.update();
    }

    update() {
        this.valid_rows = this.filter_rows(r => r.is_valid());
        this.invalid_rows = this.filter_rows(r => !r.is_valid());

        let totals = this.totals();
        this.dom.find(".total .amount").each((i, el) => $(el).text(render(totals[i])));

        let totals_valid = render(totals[0]) == render(totals[1]);
        let accounts_valid = this.validate_accounts();

        this.valid = totals_valid && accounts_valid;

        this.dom.find(".total").toggle(!(this.valid && (this.valid_rows[0].length == 1) && (this.valid_rows[1].length == 1)));

        for (let i = 0; i < 2; i++) {
            if (!this.column_data[i].edit_enabled) continue;

            let target_row_count = (totals_valid || !this._editable) ? 0 : 2;

            for (let j = this.invalid_rows[i].length; j < target_row_count; j++) {
                let amount = this.rows[i].length == 0 ? totals[1 - i] : 0;
                this.add_row({ account: { id: 0, is_bank: false }, amount }, i);
            }
            for (let j = this.invalid_rows[i].length; j > target_row_count; j--) {
                this.remove_row(this.invalid_rows[i][j - 1], i);
            }
        }

        this.dom.find(".total").toggleClass("error", !totals_valid);
        this.dom.find(".error-message").toggle(!accounts_valid);
    }

    add_row(row, column_index) {
        let row_object = new BalanceRow(this._editable, this.column_data[column_index].edit_enabled, row.account, row.amount);
        this.dom.find(".accounts").eq(column_index).append(row_object.dom);
        this.rows[column_index].push(row_object);
        row_object.addEventListener("update", () => this.update());
    }

    remove_row(row, column_index) {
        row.dom.remove();
        this.rows[column_index].splice(this.rows[column_index].indexOf(row), 1);
    }

    filter_rows(filter) {
        return this.rows.map(row_set => row_set.filter(filter));
    }

    totals() {
        return this.valid_rows.map(row_set =>
            row_set.map(r => r.amount)
                .reduce((a, b) => a + b, 0)
        );
    }

    validate_accounts() {
        let accounts = [];
        for (let column of this.valid_rows) {
            for (let row of column) {
                let account = row.account.id;
                if (accounts.indexOf(account) != -1) {
                    return false;
                }
                accounts.push(account);
            }
        }
        return true;
    }
}

class BalanceRow extends EventTarget {
    constructor(editable, edit_enabled, account, amount) {
        super();

        this.edit_enabled = edit_enabled;
        this.account = account;
        this.amount = Math.abs(parseFloat(amount));

        this.dom = $("<div></div>");
        this.editable = editable;
    }
    
    /**
     * @param {boolean} editable
     */
    set editable(editable) {
        if (editable == this._editable) return;
        this._editable = editable;

        this.dom = clone_template(editable ? "template.row.editable" : "template.row.not-editable").replaceAll(this.dom);

        if (editable) {
            this.dom.find(".amount")
                .val(render(this.amount))
                .click(function () { setTimeout(() => $(this).select(), 0) })
                .change(() => this.update())
                .prop("disabled", !this.edit_enabled);
            get_account_select(this.account.is_bank).then(a => 
                a.replaceAll(this.dom.find(".label"))
                .addClass("label")
                .prop("disabled", !this.edit_enabled)
                .selectize({
                    allowEmptyOption: true,
                    showEmptyOptionInDropdown: true,
                    items: [this.account.id],
                    onChange: () => this.update(),
                }));
        } else {
            this.dom.find(".label").text(`${this.account.number}: ${this.account.name}`);
            this.dom.find(".amount").text(render(this.amount));
        }
    }

    update() {
        this.amount = parseFloat(this.dom.find("input.amount").val());
        this.dom.find(".amount").val(render(this.amount));

        this.account.id = parseInt(this.dom.find("select.label").val());
        [this.account.number, this.account.name] = this.dom.find("select.label option:selected").text().split(": ");

        this.dispatchEvent(new Event("update"));
    }

    is_valid() {
        return this.account.id && this.amount;
    }
}