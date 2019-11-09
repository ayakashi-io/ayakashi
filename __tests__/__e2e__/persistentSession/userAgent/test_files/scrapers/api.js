const deliverResults = require("../../../../../utils/deliverResults");

module.exports = async function(ayakashi, input, params) {
    const resp = await ayakashi.get(`http://localhost:${params.staticServerPort}/user_agent`);

    await deliverResults(params.port, {
        ua: resp.ua
    });
};
