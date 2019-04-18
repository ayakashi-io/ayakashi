//tslint:disable
import "jest-extended";
//tslint:enable
import normalizeExtraction from "../../src/coreScripts/normalizeExtractions";

describe("normalizeExtraction", function() {
    test("single", function() {
        const extraction = {
            test1: [{
                text1: "test1"
            }],
            test2: [{
                text2: "test2"
            }],
            test3: [{
                text3: "test3"
            }]
        };
        const normalized = normalizeExtraction(extraction);
        expect(normalized).toEqual([{
            text1: "test1",
            text2: "test2",
            text3: "test3"
        }]);
    });

    test("single with same key", function() {
        const extraction = {
            test1: [{
                text1: "test1"
            }],
            test2: [{
                text2: "test2"
            }],
            test3: [{
                text1: "test3"
            }]
        };
        const normalized = normalizeExtraction(extraction);
        expect(normalized).toEqual([{
            text1: "test1",
            text2: "test2",
            test3_text1: "test3"
        }]);
    });

    test("single with many same keys", function() {
        const extraction = {
            test1: [{
                text: "test1"
            }],
            test2: [{
                text: "test2"
            }],
            test3: [{
                text: "test3"
            }]
        };
        const normalized = normalizeExtraction(extraction);
        expect(normalized).toEqual([{
            text: "test1",
            test2_text: "test2",
            test3_text: "test3"
        }]);
    });

    test("multiple", function() {
        const extraction = {
            test1: [{
                text1: "test1"
            }, {
                text1_1: "test1"
            }],
            test2: [{
                text2: "test2"
            }, {
                text2_2: "test2"
            }],
            test3: [{
                text3: "test3"
            }, {
                text3_3: "test3"
            }]
        };
        const normalized = normalizeExtraction(extraction);
        expect(normalized).toEqual([{
            text1: "test1",
            text2: "test2",
            text3: "test3"
        }, {
            text1_1: "test1",
            text2_2: "test2",
            text3_3: "test3"
        }]);
    });

    test("multiple with same key", function() {
        const extraction = {
            test1: [{
                text1: "test1"
            }, {
                text1_1: "test1_1"
            }],
            test2: [{
                text2: "test2"
            }, {
                text2_2: "test2_2"
            }],
            test3: [{
                text3: "test3"
            }, {
                text1_1: "test3_3"
            }]
        };
        const normalized = normalizeExtraction(extraction);
        expect(normalized).toEqual([{
            text1: "test1",
            text2: "test2",
            text3: "test3"
        }, {
            text1_1: "test1_1",
            text2_2: "test2_2",
            test3_text1_1: "test3_3"
        }]);
    });

    test("multiple with many same keys", function() {
        const extraction = {
            test1: [{
                text1: "test1"
            }, {
                text1_1: "test1_1"
            }],
            test2: [{
                text1: "test2"
            }, {
                text2_2: "test2_2"
            }],
            test3: [{
                text3: "test3"
            }, {
                text1_1: "test3_3"
            }]
        };
        const normalized = normalizeExtraction(extraction);
        expect(normalized).toEqual([{
            text1: "test1",
            test2_text1: "test2",
            text3: "test3"
        }, {
            text1_1: "test1_1",
            text2_2: "test2_2",
            test3_text1_1: "test3_3"
        }]);
    });

    test("multiple when all keys are the same", function() {
        const extraction = {
            test1: [{
                text: "test1"
            }, {
                text: "test1_1"
            }],
            test2: [{
                text: "test2"
            }, {
                text: "test2_2"
            }],
            test3: [{
                text: "test3"
            }, {
                text: "test3_3"
            }]
        };
        const normalized = normalizeExtraction(extraction);
        expect(normalized).toEqual([{
            text: "test1",
            test2_text: "test2",
            test3_text: "test3"
        }, {
            text: "test1_1",
            test2_text: "test2_2",
            test3_text: "test3_3"
        }]);
    });

    test("empty extractions", function() {
        const extraction = {
            test1: []
        };
        const normalized = normalizeExtraction(extraction);
        expect(normalized).toEqual([]);
    });

    test("invalid extraction", function() {
        const extraction = {
            test1: {}
        };
        //@ts-ignore
        const normalized = normalizeExtraction(extraction);
        expect(normalized).toEqual([]);
    });

    test("invalid extraction, null", function() {
        const extraction = null;
        //@ts-ignore
        const normalized = normalizeExtraction(extraction);
        expect(normalized).toEqual([]);
    });

    test("invalid extraction, number", function() {
        const extraction = 5;
        //@ts-ignore
        const normalized = normalizeExtraction(extraction);
        expect(normalized).toEqual([]);
    });
});
