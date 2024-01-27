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
        this.dom = clone_template("template.account-overview");
        this._editable = editable;

        this.rows = [[], []];
        this.valid = false;
        this.valid_rows = [];
        this.invalid_rows = [];

        this.column_data = column_data;
        this.populate();
    }

    add_row(row, column_index) {
        let row_object = new AccountOverviewRow(this._editable, this.column_data[column_index].edit_enabled, row.account, row.graph, row.budget);
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
                r.graph[0].amount,
                r.graph[r.graph.length - 1].amount,
                r.budget,
            ]).reduce((a, b) => a.map((_, i) => a[i] + b[i]), [0, 0, 0])
        );
    }
}

class AccountOverviewRow extends BalanceRow {
    constructor(editable, edit_enabled, account, graph, budget) {
        super();

        this.edit_enabled = edit_enabled;
        this.account = account;
        this.graph = graph;
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
        this.dom.find(".start-amount").text(render(this.graph[0].amount));
        this.dom.find(".end-amount").text(render(this.graph[this.graph.length - 1].amount));
        this.dom.find(".budget").text(render(this.budget));
    }

    is_valid() {
        return true;
    }
}