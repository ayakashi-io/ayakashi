module.exports = async function(ayakashi, input) {
    return {
        manifest: await ayakashi.get(input.page)
    };
};
