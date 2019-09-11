//tslint:disable
import "jest-extended";
import {JSDOM} from "jsdom";
//tslint:enable

import {domQuery} from "../../src/domQL/domQL";

const dom = new JSDOM(`
    <style>
        .listValues {
            color: red;
        }
    </style>
    <div style="color:blue" class="match match2">
        <ul id="myList" class="match match2">
            <li class="listValues" data-my="test">value 1</li>
            <li class="listValues match match2">value 2</li>
            <li class="listValues match match2">value 3</li>
        </ul>
    </div>
`);

describe("test nin", function() {
    it("by id, strict", function() {
        const results = domQuery({
            where: {
                id: {
                    $nin: ["myList"]
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeEmpty();
    });

    it("by id, non-strict", function() {
        const results = domQuery({
            where: {
                id: {
                    nin: ["myList"]
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(4);
    });

    it("with an invalid attribute, strict", function() {
        const results = domQuery({
            where: {
                anInvalidAttr: {
                    $nin: ["hi"]
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeEmpty();
    });

    it("with an invalid attribute, non-strict", function() {
        const results = domQuery({
            where: {
                anInvalidAttr: {
                    nin: ["hi"]
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(5);
    });

    it("by id with recursive: false", function() {
        const results = domQuery({
            where: {
                id: {
                    $nin: ["myList"]
                }
            }
        }, {
            env: dom.window,
            recursive: false
        });
        expect(results).toBeEmpty();
    });

    it("by class, strict", function() {
        const results = domQuery({
            where: {
                className: {
                    $nin: ["match", "match2"]
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
    });

    it("by class, strict, no match", function() {
        const results = domQuery({
            where: {
                className: {
                    $nin: ["match", "match2", "listValues"]
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(0);
    });

    it("by class, non-strict", function() {
        const results = domQuery({
            where: {
                className: {
                    nin: ["uknownClass"]
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(5);
    });

    it("by data key, strict", function() {
        const results = domQuery({
            where: {
                dataKey: {
                    $nin: ["hi"]
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toEqual(dom.window.document.querySelector("[data-my]"));
    });

    it("by data key, non-strict", function() {
        const results = domQuery({
            where: {
                dataKey: {
                    nin: ["hi"]
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(5);
    });

    it("by data value, strict", function() {
        const results = domQuery({
            where: {
                dataValue: {
                    $nin: ["someData"]
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toEqual(dom.window.document.querySelector("[data-my]"));
    });

    it("by data value, non-strict", function() {
        const results = domQuery({
            where: {
                dataValue: {
                    nin: ["someData"]
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(5);
    });

    it("by style, strict", function() {
        const results = domQuery({
            where: {
                "style-color": {
                    $nin: ["blue"]
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(3);
        expect(results).toEqual(Array.from(dom.window.document.querySelectorAll(".listValues")));
    });

    it("by style, non-strict", function() {
        const results = domQuery({
            where: {
                "style-color": {
                    nin: ["blue"]
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(4);
    });
});
