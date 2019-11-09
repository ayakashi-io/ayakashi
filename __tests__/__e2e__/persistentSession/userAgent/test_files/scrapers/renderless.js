const deliverResults = require("../../../../../utils/deliverResults");

module.exports = async function(ayakashi, input, params) {
    await ayakashi.load(`http://localhost:${params.staticServerPort}/user_agent_html`);
    ayakashi
        .selectOne("ua")
        .where({
            id: {
                eq: "ua"
            }
        });

    await deliverResults(params.port, {
        ua: await ayakashi.extractFirst("ua")
    });
};
