import Balance, { BalanceRow } from "./Balance.js";
import { clone_template, render } from "./common.js";

export default class AccountOverview extends Balance {
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
     *          budget: int,
     *      }[]
     * } [] } column_data
     */
    constructor(editable, column_data) {
        super(editable, column_data);
    }

    update() {
        super.update();

        this.dom.find(".total").removeClass("error");
    }

    add_row(row, column_index) {
        let row_object = new AccountOverviewRow(this._editable, this.column_data[column_index].edit_enabled, row.account, row.amount, row.budget);
        this.dom.find(".accounts").eq(column_index).append(row_object.dom);
        this.rows[column_index].push(row_object);
        row_object.addEventListener("update", () => this.update());
    }
}

class AccountOverviewRow extends BalanceRow {
    constructor(editable, edit_enabled, account, amount, budget) {
        super();

        this.edit_enabled = edit_enabled;
        this.account = account;
        this.amount = parseFloat(amount);
        this.budget = parseFloat(budget);

        this.dom = $("<div></div>");
        this.editable = editable;
    }
    
    /**
     * @param {boolean} editable
     */
    set editable(editable) {
        if (editable == this._editable) return;
        this._editable = editable;

        this.dom = clone_template("template.account-overview-row").replaceAll(this.dom);

        this.dom.find(".label").text(`${this.account.number}: ${this.account.name}`);
        this.dom.find(".amount").text(render(this.amount));
        this.dom.find(".budget").text(render(this.budget));
    }

    is_valid() {
        return true;
    }
}