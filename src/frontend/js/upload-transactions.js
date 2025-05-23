import { get_account_select } from "./common/common.js";
import { Account } from "./common/api.js";

const account_promise = Account.get_all();

(async () => {
    (await get_account_select(true))
        .replaceAll("div.account")
        .attr("name", "account")
        .selectize();

    /**
     * Whenever a transactions file is given, this block does the following:
     * If the file is a zip, it hides the accounts dropdown.
     * If the file is a csv, and if it can find a familiar IBAN in a `sensible
     *  place` in the file name, it sets the accounts dropdown accordingly.
     */
    $('input[name="transactions"]').change(async function () {
        let file_list = this.files;
        if (file_list.length == 0) return;
        let file = file_list[0];

        let account_input = $('select[name="account"]');

        account_input.next("div").toggle(file.type != "application/zip");

        if (file.type != "text/csv") {
            return;
        }

        const filter_functions = [
            (name, iban) => name.startsWith(iban),
            (name, iban) => name.endsWith(iban),
            (name, iban) => name.indexOf(iban) > -1,
        ];

        let sanitized_name = file.name.replace(/(\.[^.]*| )/g, "").toUpperCase();
        let accounts = await account_promise;

        for (let f of filter_functions) {
            let selected_bank_accounts = accounts.filter(a => f(sanitized_name, a.iban));
            if (selected_bank_accounts.length == 1) {
                return account_input.data("selectize").setValue(selected_bank_accounts[0].id);
            }
        }
    });
})();