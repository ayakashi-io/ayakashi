const deliverResults = require("../../../../../utils/deliverResults");

module.exports = async function(ayakashi, input, params) {
    await ayakashi.goTo("https://expired.badssl.com/");

    const title = await ayakashi.evaluate(function() {
        return document.title;
    });

    await deliverResults(params.port, {
        title: title
    });
};
