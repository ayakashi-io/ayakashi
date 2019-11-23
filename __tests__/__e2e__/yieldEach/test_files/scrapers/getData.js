module.exports = async function(ayakashi, input) {
    await ayakashi.yieldEach((new Array(30)).fill({someData: 1, moreData: "testtesttest"}));
};
