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
    <div>
        <ul id="myList">
            <li class="listValues" data-my="test">value 1</li>
            <li class="listValues">value 2</li>
            <li class="listValues">value 3</li>
        </ul>
    </div>
`);

describe("test like", function() {
    it("by id", function() {
        const results = domQuery({
            where: {
                id: {
                    like: "myList"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toBe(dom.window.document.getElementById("myList"));
    });

    it("with an invalid attribute", function() {
        const results = domQuery({
            where: {
                anInvalidAttr: {
                    like: "hi"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeEmpty();
    });

    it("by id with recursive: false", function() {
        const results = domQuery({
            where: {
                id: {
                    like: "myLi"
                }
            }
        }, {
            env: dom.window,
            recursive: false
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toBe(dom.window.document.getElementById("myList"));
    });

    it("by id, not found", function() {
        const results = domQuery({
            where: {
                id: {
                    like: "uknownId"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeEmpty();
    });

    it("by class, not found", function() {
        const results = domQuery({
            where: {
                className: {
                    like: "uknownClass"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeEmpty();
    });

    it("by data key", function() {
        const results = domQuery({
            where: {
                dataKey: {
                    like: "my"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toEqual(dom.window.document.querySelector("[data-my]"));
    });

    it("by data key, not found", function() {
        const results = domQuery({
            where: {
                dataKey: {
                    like: "uknown"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeEmpty();
    });

    it("by data value", function() {
        const results = domQuery({
            where: {
                dataValue: {
                    like: "tes"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toEqual(dom.window.document.querySelector("[data-my]"));
    });

    it("by data value, not found", function() {
        const results = domQuery({
            where: {
                dataValue: {
                    like: "uknown"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeEmpty();
    });

    it("by style", function() {
        const results = domQuery({
            where: {
                "style-color": {
                    like: "re"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(3);
        expect(results).toEqual(Array.from(dom.window.document.querySelectorAll(".listValues")));
    });

    it("by style, not found", function() {
        const results = domQuery({
            where: {
                "style-color": {
                    like: "bl"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeEmpty();
    });
});
