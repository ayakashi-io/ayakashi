const deliverResults = require("../../../../../utils/deliverResults");

module.exports = async function(ayakashi, input, params) {
    await ayakashi.goTo(`http://localhost:${params.staticServerPort}`);

    const ua = await ayakashi.evaluate(function() {
        return navigator.userAgent;
    });

    await deliverResults(params.port, {
        ua: ua
    });
};
