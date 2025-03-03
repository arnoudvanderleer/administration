import PlannedTransaction from "./common/PlannedTransaction.js";
import { Account, PlannedTransaction as PlannedTransactionModel } from "./common/api.js";

(async () => {
    let transactions = [];
    transactions = await PlannedTransactionModel.get_all();

    $(".content").append(transactions.map(t => {
        let transaction_object = new PlannedTransaction(t, false);
        $(`<span class="material-symbols-outlined">edit</span>`)
            .addClass("clickable")
            .appendTo(transaction_object.dom).click(async function(){
                if (transaction_object._editable) {
                    if (!transaction_object.balance.valid) return;
                    let rows = transaction_object.balance.valid_rows;

                    let mutations = rows.map((column, j) => column.map(row => ({
                        amount: (j * 2 - 1) * row.amount,
                        AccountId: row.account.id,
                    }))).reduce((a, b) => a.concat(b), []);

                    await PlannedTransactionModel.update(transaction_object.transaction.id, {
                        PlannedMutations: mutations,
                        description: $(transaction_object.dom).find(".description").text(),
                        nextDate: $(transaction_object.dom).find(".date").val(),
                        period: $(transaction_object.dom).find(".period").val(),
                        periodUnit: $(transaction_object.dom).find(".period-unit").val(),
                    });
                }
                transaction_object.editable = !transaction_object._editable;
                $(this).text(transaction_object._editable ? "save" : "edit");
            });
        $(`<span class="material-symbols-outlined">delete</span>`)
            .addClass("clickable")
            .appendTo(transaction_object.dom).click(async () => {
                await PlannedTransactionModel.delete(transaction_object.transaction.id);
                $(transaction_object.dom).remove();
            });
        return transaction_object.dom;
    }));
})();