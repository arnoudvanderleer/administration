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
    constructor(column_data) {
        super(false, column_data);
        this.dom = clone_template("template.account-overview");

        this.rows = [[], []];
        this.valid = false;
        this.valid_rows = [];
        this.invalid_rows = [];

        this.column_data = column_data;
        this.populate();
    }

    add_row(row, column_index) {
        let row_object = new AccountOverviewRow(row);
        this.dom.find(".accounts").eq(column_index).append(row_object.dom);
        this.rows[column_index].push(row_object);
    }

    update() {
        this.valid_rows = this.rows;
        let totals = this.totals();
        this.dom.find(".total").each((i, el) => {
            $(el).find(".start-amount").text(render(totals[i][0]));
            $(el).find(".end-amount").text(render(totals[i][1]));
            $(el).find(".budget").text(render(totals[i][2]));
        });
    }

    totals() {
        return this.valid_rows.map(row_set =>
            row_set.map(r => [
                r.account.start_amount,
                r.account.end_amount,
                r.account.budget,
            ]).reduce((a, b) => a.map((_, i) => a[i] + b[i]), [0, 0, 0])
        );
    }
}

class AccountOverviewRow extends BalanceRow {
    constructor(account) {
        super();

        this.account = account;

        this.dom = clone_template("template.account-overview-row").replaceAll(this.dom);
        this.dom.find(".label").text(`${this.account.number}: ${this.account.name}`);
        this.dom.find(".start-amount").text(render(this.account.start_amount));
        this.dom.find(".end-amount").text(render(this.account.end_amount));
        this.dom.find(".budget").text(render(this.account.budget));
    }

    is_valid() {
        return true;
    }
}