module.exports = function(ayakashi) {
    ayakashi.registerExtractor("extractor1", function() {
        return {
            extract: function(_element) {
                return "extractor1";
            },
            isValid: function(result) {
                return !!result;
            },
            useDefault: function() {
                return "oops";
            }
        };
    });
};
