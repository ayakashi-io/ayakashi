const deliverResults = require("../../../../utils/deliverResults");

module.exports = async function(input, params) {
    await deliverResults(params.port, input);
};
