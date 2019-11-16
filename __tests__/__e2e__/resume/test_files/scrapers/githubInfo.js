const {existsSync} = require("fs");
const {tmpdir} = require("os");

module.exports = async function(ayakashi, input) {
    if (existsSync(`${tmpdir()}/ayakashi_resume_test`)) {
        throw new Error("i am dead");
    }
    await ayakashi.goTo(input.page);
    ayakashi
        .select("name")
        .where({itemprop: {eq: "name"}});
    ayakashi
        .select("author")
        .where({itemprop: {eq: "author"}});
    ayakashi
        .select("about")
        .where({itemprop: {eq: "about"}});

    return {
        name: await ayakashi.extractFirst("name"),
        author: await ayakashi.extractFirst("author"),
        about: await ayakashi.extractFirst("about")
    };
};
