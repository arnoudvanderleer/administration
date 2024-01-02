import Transaction from "./common/Transaction.js";
import { Transaction as TransactionModel } from "./common/api.js";

(async () => {
    let transaction = new Transaction({
        date: new Date().toISOString().substring(0, 10),
        description: "Omschrijving",
        Mutations: [],
    }, true);

    $(".transactions").append(transaction.dom);
    $(transaction.dom).find(".date").replaceWith(`<input type="date" class="date" value="${transaction.transaction.date}" />`);

    let save_button = $(`<span class="material-symbols-outlined">save</span>`)
        .addClass("clickable")
        .appendTo(transaction.dom).click(async () => {
            if (!transaction.balance.valid) return;
            let rows = transaction.balance.valid_rows;

            let mutations = rows.map((column, j) => column.map(row => ({
                amount: (j * 2 - 1) * row.amount,
                AccountId: row.account.id,
            }))).reduce((a, b) => a.concat(b), []);

            await TransactionModel.add({
                Mutations: mutations,
                date: $(transaction.dom).find(".date").val(),
                description: $(transaction.dom).find(".description").text(),
                complete: true,
            });
            transaction.editable = !transaction._editable;
            save_button.remove();
        });
})();
