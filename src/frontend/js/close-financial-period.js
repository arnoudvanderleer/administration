import { FinancialPeriod } from "./common/api.js";

(async () => {
    if (!report(await FinancialPeriod.close(false))) {
        return $("div.form").remove();
    }

    let financial_periods = await FinancialPeriod.get_all();
    let financial_period = financial_periods.filter(p => p.id == current_financial_period)[0];

    let new_start = new Date(financial_period.end_date);
    new_start.setDate(new_start.getDate() + 1);

    let new_end = new Date(financial_period.end_date);
    new_end.setFullYear(new_end.getFullYear() + 1);
    
    $('.form .start-date').val(new_start.toISOString().substring(0, 10));
    $('.form .end-date').val(new_end.toISOString().substring(0, 10));

    $('.form button.close-financial-period').click(async () => {
        if (report(await FinancialPeriod.close(true, $('.form .end-date').val()))) {
            $('.content > *:not(.messages)').remove();

            $('<p>Gelukt! <a href="/">Terug naar het hoofdscherm</a></p>').prependTo('.content');
        }
    });
})();

function report(messages) {
    $('.messages').empty();
    for (let message of messages) {
        let message_node = $('<p></p>')
            .appendTo('.messages')
            .text(message.text);
        if (!message.success) {
            message_node.addClass('error');
        }
    }

    return messages.map(m => m.success).reduce((a, b) => a && b, true);
}
