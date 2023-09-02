import Transaction from "./common/Transaction.js";

(async () => {
    let transactions = await $.getJSON("/models/transaction" + (id ? "/" + id : ""));

    $(".content").append(transactions.map(t => {
        let transaction_object = new Transaction(t, false);
        let edit_button = $(`<span class="material-symbols-outlined">edit</span>`)
            .addClass("clickable")
            .appendTo(transaction_object.dom).click(async () => {
                if (transaction_object._editable) {
                    if (!transaction_object.balance.valid) return;
                    let rows = transaction_object.balance.valid_rows;

                    let mutations = rows.map((column, j) => column.map(row => ({
                        amount: (j * 2 - 1) * row.amount,
                        AccountId: row.account.id,
                    }))).reduce((a, b) => a.concat(b), []);

                    await $.ajax({
                        type: "PUT",
                        url: `/models/transaction/${transaction_object.transaction.id}`,
                        data: JSON.stringify({
                            Mutations: mutations,
                            description: $(transaction_object.dom).find(".description").text(),
                            complete: true,
                        }),
                        contentType: "application/json",
                    });
                }
                transaction_object.editable = !transaction_object._editable;
                edit_button.text(transaction_object._editable ? "save" : "edit");
            });
        return transaction_object.dom;
    }));
})();