module.exports = function(ayakashi) {
    ayakashi
        .select("name")
        .where({itemprop: {eq: "name"}});
};
