import { FinancialPeriod } from "./common/api.js";
import { render_date } from "./common/common.js";

(async () => {
    $("select.financial-period").append((await FinancialPeriod.get_all()).map(p => 
        $("<option />")
            .text(`${render_date(p.start_date)} - ${render_date(p.end_date)}`)
            .attr("value", p.id)
    )).change(async function () {
        await FinancialPeriod.set_period($(this).val());
        location.reload();
    });
    $(`select.financial-period option[value="${current_financial_period}"]`).prop({selected: true});
})();