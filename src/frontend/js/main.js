import { render_date } from "./common/common.js";

(async () => {
    let financial_periods = await $.getJSON('/models/financial-period');
    $("select.financial-period").append(financial_periods.map(p => 
        $("<option />")
            .text(`${render_date(p.start_date)} - ${render_date(p.end_date)}`)
            .attr("value", p.id)
    )).change(async function () {
        await $.ajax({
            type: 'PUT',
            url: '/api/financial-period',
            contentType : "application/json",
            data: JSON.stringify({id: $(this).val()}),
        });
        location.reload();
    });
    $(`select.financial-period option[value="${current_financial_period}"]`).prop({selected: true});
})();