import { clone_template, render_date } from "./common/common.js";

(async () => {
    let financial_periods = await $.getJSON("/models/financial-period");
    financial_periods.forEach(add_row);
})();

$("table.periods tfoot span.save").click(async function () {
    let data = {
        start_date: $("table.periods tfoot input.start").val(),
        end_date: $("table.periods tfoot input.end").val(),
    };
    await $.ajax({
        type: "POST",
        url: '/models/financial-period',
        contentType : "application/json",
        data: JSON.stringify(data),
    });
    add_row(data);
    $(this).find("input").val(null);
});

function add_row(period) {
    let row = clone_template("template.row-static");
    row.find(".start").text(render_date(period.start_date));
    row.find(".end").text(render_date(period.end_date));
    $("table.periods tbody").append(row);
}
