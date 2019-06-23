import {IAyakashiInstance} from "../prelude/prelude";
import {ExtractorFn} from "../prelude/actions/extract";

export function attachCoreExtractors(ayakashiInstance: IAyakashiInstance) {
    ayakashiInstance.registerExtractor("text", function() {
        return {
            extract: function(element): string | null {
                let data: string | null = null;
                if (element.nodeType === 3) {
                    data = element.data.trim().replace(/[\s\n\r]+/g, " ");
                } else {
                    if (element.text && element.text.length > 0) {
                        data = element.text.trim().replace(/[\s\n\r]+/g, " ");
                    } else if (element.textContent && element.textContent.length > 0) {
                        data = element.textContent.trim().replace(/[\s\n\r]+/g, " ");
                    }
                }
                return data;
            },
            isValid: function(result: string | null) {
                return !!result;
            },
            useDefault: function(): string {
                return "";
            }
        };
    });

    const integerExtractor: ExtractorFn = function() {
        const self = this;
        return {
            extract: function(element) {
                //@ts-ignore
                const textExtractor = self.extractors.text();
                let textResult: string = textExtractor.extract(element);
                if (!textExtractor.isValid(textResult)) {
                    textResult = textExtractor.useDefault();
                }
                const match = textResult.match(/\d/g);
                if (match) {
                    textResult = match.join("");
                }
                return parseInt(textResult);
            },
            isValid: function(result: number) {
                return Number.isInteger(result);
            },
            useDefault: function() {
                return 0;
            }
        };
    };

    ayakashiInstance.registerExtractor("integer", integerExtractor, ["text"]);
    ayakashiInstance.registerExtractor("number", integerExtractor, ["text"]);

    ayakashiInstance.registerExtractor("float", function() {
        const self = this;
        return {
            extract: function(element) {
                //@ts-ignore
                const textExtractor = self.extractors.text();
                let textResult: string = textExtractor.extract(element);
                if (!textExtractor.isValid(textResult)) {
                    textResult = textExtractor.useDefault();
                }
                const match = textResult.match(/\d|,|\./g);
                if (match) {
                    textResult = match.join("").replace(",", ".");
                }
                return parseFloat(textResult);
            },
            isValid: function(result: number) {
                return Number.isInteger(parseInt(result.toString()));
            },
            useDefault: function() {
                return 0;
            }
        };
    }, ["text"]);
}
