const {post} = require("@ayakashi/request");

module.exports = async function(port, results) {
    await post(`http://localhost:${port}/results`, {
        json: results
    });
};
