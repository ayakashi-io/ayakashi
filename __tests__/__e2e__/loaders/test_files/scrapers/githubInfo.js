module.exports = async function(ayakashi, input) {
    await ayakashi.goTo(input.page);

    const preloader1 = await ayakashi.evaluate(function() {
        return window.preloader1;
    });
    const preloader2 = await ayakashi.evaluate(function() {
        return window.ayakashi.preloaders.preloader2();
    });
    const preloader3 = await ayakashi.evaluate(function() {
        return window.ayakashi.preloaders.preloader3();
    });

    return {
        name: await ayakashi.extractFirst("name"),
        author: await ayakashi.extractFirst("author"),
        actions: [
            ayakashi.action1(),
            ayakashi.action2(),
            ayakashi.external_action1(),
            ayakashi.external_action2()
        ],
        extractors: [
            await ayakashi.extractFirst("name", "extractor1"),
            await ayakashi.extractFirst("name", "extractor2")
        ],
        preloaders: [preloader1, preloader2, preloader3]
    };
};
