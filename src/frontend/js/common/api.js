class CrudModel {
    constructor(base_url) {
        this.base_url = base_url;
    }

    static base_get(url) {
        return $.getJSON(url);
    }

    get_all(from = null, to = null) {
        return CrudModel.base_get(`${this.base_url}${this.generate_query({from, to})}`);
    }

    static base_add(url, data) {
        return $.ajax({
            type: "POST",
            url,
            data: JSON.stringify(data),
            contentType: "application/json",
        });
    }

    add(data) {
        return CrudModel.base_add(this.base_url, data);
    }

    static base_update(url, data) {
        return $.ajax({
            type: "PUT",
            url,
            data: JSON.stringify(data),
            contentType: "application/json",
        });
    }

    update(id, data) {
        return CrudModel.base_update(this.base_url + id, data);
    }

    static base_delete(url) {
        return $.ajax({
            url: url,
            type: "DELETE",
        });
    }

    delete(id) {
        return CrudModel.base_delete(this.base_url + id);
    }

    generate_query (params) {
        let verified_params = {};
        let exists = false;
        for (let [key, value] of Object.entries(params)) {
            if (value) {
                verified_params[key] = value;
                exists = true;
            }
        }
        return exists ? "?" + new URLSearchParams(verified_params) : "";
    }
}

export const Account = new (class extends CrudModel {
    get_overview(date) {
        return CrudModel.base_get(`/api/account-overview?date=${date}`);
    }

    get_graph(id, from, to) {
        return CrudModel.base_get(`/api/graph/${id}?from=${from}&to=${to}`);
    }

    get_transactions(id, from = null, to = null) {
        return CrudModel.base_get(`/models/account/${id}/transaction${this.generate_query({from, to})}`);
    }
})("/models/account/");

export const FinancialPeriod = new (class extends CrudModel {
    set_period(id) {
        return CrudModel.base_update('/api/financial-period', {id});
    }
})("/models/financial-period/");

export const Transaction = new (class extends CrudModel {
    get_unprocessed(id) {
        return CrudModel.base_get(`/api/unprocessed-transactions/${id}`);
    }
})("/models/transaction/");
