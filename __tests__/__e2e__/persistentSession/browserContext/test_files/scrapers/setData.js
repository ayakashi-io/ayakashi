module.exports = async function(ayakashi, input, params) {
    await ayakashi.goTo(`http://localhost:${params.staticServerPort}`);

    await ayakashi.evaluate(function() {
        localStorage.setItem("myKey", "ayakashi");
    });
};
