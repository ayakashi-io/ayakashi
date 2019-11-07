const {post} = require("@ayakashi/request");

module.exports = async function(input, params) {
    await post(`http://localhost:${params.port}/results`, {
        json: input
    });
};
