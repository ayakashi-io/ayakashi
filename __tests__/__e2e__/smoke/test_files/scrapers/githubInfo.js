module.exports = async function(ayakashi, input) {
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
