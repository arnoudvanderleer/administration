import Transaction from "./common/Transaction.js";
import { load_hash } from "./common/common.js";
import { Account, Transaction as TransactionModel } from "./common/api.js";

(async () => {
    let interval = load_hash();

    let transactions = [];
    if (id) {
        transactions = await Account.get_transactions(id, interval.from, interval.to);
    } else {
        transactions = await TransactionModel.get_all(interval.from, interval.to);
    }

    $(".content").append(transactions.map(t => {
        let transaction_object = new Transaction(t, false);
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

                    await TransactionModel.update(transaction_object.transaction.id, {
                        Mutations: mutations,
                        date: $(transaction_object.dom).find(".date").val(),
                        description: $(transaction_object.dom).find(".description").text(),
                        complete: true,
                    });
                }
                transaction_object.editable = !transaction_object._editable;
                $(this).text(transaction_object._editable ? "save" : "edit");
            });
        $(`<span class="material-symbols-outlined">delete</span>`)
            .addClass("clickable")
            .appendTo(transaction_object.dom).click(async () => {
                await TransactionModel.delete(transaction_object.transaction.id);
                $(transaction_object.dom).remove();
            });
        return transaction_object.dom;
    }));
})();