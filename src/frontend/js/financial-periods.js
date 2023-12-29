import { clone_template, render_date } from "./common/common.js";
import { FinancialPeriod } from "./common/api.js";

(async () => {
    (await FinancialPeriod.get_all())
        .forEach(add_row);
})();

$("table.periods tfoot span.save").click(async function () {
    let data = {
        start_date: $("table.periods tfoot input.start").val(),
        end_date: $("table.periods tfoot input.end").val(),
    };
    await FinancialPeriod.add(data);
    add_row(data);
    $(this).find("input").val(null);
});

function add_row(period) {
    let row = clone_template("template.row-static");
    row.find(".start").text(render_date(period.start_date));
    row.find(".end").text(render_date(period.end_date));
    $("table.periods tbody").append(row);
}
