const deliverResults = require("../../../../../utils/deliverResults");

module.exports = async function(ayakashi, input, params) {
    try {
        await ayakashi.load("https://expired.badssl.com/");
    } catch (e) {
        await deliverResults(params.port, {
            errorMessage: e.message
        });
    }
    ayakashi
        .selectOne("title")
        .where({
            tagName: {
                eq: "title"
            }
        })
        .from("head");
    const title = await ayakashi.extractFirst("title");

    await deliverResults(params.port, {
        title: title
    });

    return {title: title};
};
