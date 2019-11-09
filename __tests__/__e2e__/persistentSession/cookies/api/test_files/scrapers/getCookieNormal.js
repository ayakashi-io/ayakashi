const deliverResults = require("../../../../../../utils/deliverResults");

module.exports = async function(ayakashi, input, params) {
    await ayakashi.goTo(`http://localhost:${params.staticServerPort}`);

    const cookies = await ayakashi.getCookies();

    await deliverResults(params.port, {
        cookies: cookies
    });
};
