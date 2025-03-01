import PlannedTransaction from "./common/PlannedTransaction.js";
import { PlannedTransaction as PlannedTransactionModel } from "./common/api.js";

(async () => {
    let date = new Date();
    date.setDate(date.getDate() + 1);

    let transaction = new PlannedTransaction({
        date: date.toISOString().substring(0, 10),
        period: 1,
        periodUnit: "month",
        description: "Omschrijving",
        Mutations: [],
    }, true);

    $(".transactions").append(transaction.dom);

    let save_button = $(`<span class="material-symbols-outlined">save</span>`)
        .addClass("clickable")
        .appendTo(transaction.dom).click(async () => {
            if (!transaction.balance.valid) return;
            let rows = transaction.balance.valid_rows;

            let mutations = rows.map((column, j) => column.map(row => ({
                amount: (j * 2 - 1) * row.amount,
                AccountId: row.account.id,
            }))).reduce((a, b) => a.concat(b), []);

            await PlannedTransactionModel.add({
                Mutations: mutations,
                description: $(transaction.dom).find(".description").text(),
                nextDate: $(transaction.dom).find(".date").val(),
                period: $(transaction.dom).find(".period").val(),
                periodUnit: $(transaction.dom).find(".period-unit").val(),
            });
            transaction.editable = false;
            save_button.remove();
        });
})();
