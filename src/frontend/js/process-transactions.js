import Transaction from "./common/Transaction.js";
import { Transaction as TransactionModel } from "./common/api.js";
import { get_account_select } from "./common/common.js";

let transaction_objects = [];

(async () => {
    (await get_account_select(true))
        .appendTo(".content")
        .selectize();
    $("<button>Verwerken</button>").appendTo(".content").click(function () {
        let id = $(this).siblings("select").val();
        $(this).parent().children().remove();
        show_transactions(id);
    });
})();

async function show_transactions(id) {
    transaction_objects = (await TransactionModel.get_unprocessed(id)).map(populate_transaction);
    $('.content').append(transaction_objects.map(t => t.dom));
    $("<button>Opslaan</button>")
        .appendTo(".content")
        .click(save);
    $("<button>De rest uitstellen</button>").appendTo(".content").click(() => {
        let not_ready = transaction_objects.filter(t => !t.balance.valid && !t.postponed);
        not_ready.forEach(t => set_postponed(t, true));
    });
}

function populate_transaction(transaction) {
    let transaction_object = new Transaction(transaction, true);
    transaction_object.postponed = false;
    $("<div></div>")
        .addClass("transaction-content")
        .append(transaction_object.dom.children())
        .appendTo(transaction_object.dom);
    $(`<div class="postpone clickable">
        <div class="postpone-block">
            <span class="postpone-text">Uitstellen</span>
            <span class="material-symbols-outlined">expand_less</span>
        </div>
    </div>`)
        .appendTo(transaction_object.dom)
        .click(() => set_postponed(transaction_object, !transaction_object.postponed));
    transaction_object.dom.keydown(e => {
        if (e.which == 9) { // tab
            let direction = (e.shiftKey ? "prev" : "next");
            let next_input = transaction_object.dom[direction]().find('select:not([disabled])');
            if (next_input.length > 0) {
                next_input.get(0).selectize.focus();
            }
        }
    });
    return transaction_object;
}

function set_postponed(transaction, postpone) {
    transaction.dom.find(".postpone .material-symbols-outlined").text(postpone ? "expand_more" : "expand_less");
    transaction.dom.find(".postpone .postpone-text").text(postpone ? transaction.transaction.description : "Uitstellen");
    transaction.dom.find(".transaction-content").slideToggle(postpone);
    transaction.postponed = postpone;
}

function save() {
    let not_ready = transaction_objects.filter(t => !t.balance.valid && !t.postponed);
    if (not_ready.length > 0) {
        let rect = not_ready[0].dom.get(0).getBoundingClientRect();
        window.scrollTo(window.scrollX + rect.left, window.scrollY + rect.top);
        return;
    }
    
    window.scrollTo(0, 0);
    transaction_objects.forEach(async (transaction, i) => {
        if (transaction.postponed) return;

        let rows = transaction.balance.valid_rows;

        let mutations = rows.map((column, j) => column.map(row => ({
            amount: (j * 2 - 1) * row.amount,
            AccountId: row.account.id,
        }))).reduce((a, b) => a.concat(b), []);

        await $(transaction.dom).delay(i * 100).promise();
        await TransactionModel.update(transaction.transaction.id, {
            Mutations: mutations,
            date: transaction.date,
            description: $(transaction.dom).find(".description").text(),
            complete: true,
        });
        await $(transaction.dom).slideUp(500).promise();
        $(transaction.dom).remove();
        transaction_objects.splice(transaction_objects.indexOf(transaction), 1);
    });
}