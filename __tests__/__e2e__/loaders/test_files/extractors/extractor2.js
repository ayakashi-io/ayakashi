Object.defineProperty(exports, "__esModule", {value: true});

function default_1(ayakashi) {
    ayakashi.registerExtractor("extractor2", function() {
        return {
            extract: function(_element) {
                return "extractor2";
            },
            isValid: function(result) {
                return !!result;
            },
            useDefault: function() {
                return "oops";
            }
        };
    });
}

exports.default = default_1;
