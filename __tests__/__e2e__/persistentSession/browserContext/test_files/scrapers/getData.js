const deliverResults = require("../../../../../utils/deliverResults");

module.exports = async function(ayakashi, input, params) {
    await ayakashi.goTo(`http://localhost:${params.staticServerPort}`);

    const myKey = await ayakashi.evaluate(function() {
        return localStorage.getItem("myKey");
    });

    await deliverResults(params.port, {
        myKey: myKey
    });
};
