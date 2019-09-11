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
    <div style="color:blue" class="match">
        <ul id="myList" class="match">
            <li class="listValues" data-my="test">value 1</li>
            <li class="listValues match">value 2</li>
            <li class="listValues match">value 3</li>
        </ul>
    </div>
`);

describe("test nlike", function() {
    it("by id, strict", function() {
        const results = domQuery({
            where: {
                id: {
                    $nlike: "myL"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeEmpty();
    });

    it("by id, strict, with regex", function() {
        const results = domQuery({
            where: {
                id: {
                    $nlike: /myL/
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
                    nlike: "myL"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(4);
    });

    it("by id, non-strict, with regex", function() {
        const results = domQuery({
            where: {
                id: {
                    nlike: /myL/
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
                    $nlike: "hi"
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
                    nlike: "hi"
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
                    $nlike: "myL"
                }
            }
        }, {
            env: dom.window,
            recursive: false
        });
        expect(results).toBeEmpty();
    });

    it("by class, non-strict", function() {
        const results = domQuery({
            where: {
                className: {
                    nlike: "uknownClass"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(5);
    });

    it("by class, strict", function() {
        const results = domQuery({
            where: {
                class: {
                    $nlike: "match"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
    });

    it("by data key, strict", function() {
        const results = domQuery({
            where: {
                dataKey: {
                    $nlike: "hi"
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
                    nlike: "hi"
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
                    $nlike: "someData"
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
                    nlike: "someData"
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
                    $nlike: "blue"
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
                    nlike: "re"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(2);
    });
});
