const deliverResults = require("../../../../../utils/deliverResults");

module.exports = async function(ayakashi, input, params) {
    try {
        await ayakashi.get("https://expired.badssl.com/");
    } catch (e) {
        await deliverResults(params.port, {
            errorMessage: e.message
        });
    }

    await deliverResults(params.port, {
        errorMessage: ""
    });
};
