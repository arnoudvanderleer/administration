import { get_account_select } from "./common/common.js";

(async () => {
    (await get_account_select(true))
        .replaceAll("div.account")
        .attr("name", "account")
        .selectize();
})();