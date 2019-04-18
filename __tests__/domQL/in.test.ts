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
        <ul id="anotherList">
            <li class="listValues" data-my="test">value 1</li>
            <li class="listValues">value 2</li>
            <li class="listValues">value 3</li>
        </ul>
    </div>
`);

describe("test in", function() {
    it("by id", function() {
        const results = domQuery({
            where: {
                id: {
                    in: ["myList", "anotherList"]
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(2);
        expect(results).toEqual([
            dom.window.document.getElementById("myList"),
            dom.window.document.getElementById("anotherList")
        ]);
    });

    it("with an invalid attribute", function() {
        const results = domQuery({
            where: {
                anInvalidAttr: {
                    in: ["oh hi"]
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
                    in: ["myList", "anotherList"]
                }
            }
        }, {
            env: dom.window,
            recursive: false
        });
        expect(results).toBeArrayOfSize(2);
        expect(results).toEqual([
            dom.window.document.getElementById("myList"),
            dom.window.document.getElementById("anotherList")
        ]);
    });

    it("by id, not found", function() {
        const results = domQuery({
            where: {
                id: {
                    in: ["uknownId", "123"]
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeEmpty();
    });

    it("by class", function() {
        const results = domQuery({
            where: {
                class: {
                    in: ["listValues", "aClass"]
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(6);
        expect(results).toEqual(Array.from(dom.window.document.querySelectorAll(".listValues")));
    });

    it("by class, not found", function() {
        const results = domQuery({
            where: {
                className: {
                    in: ["uknownClass", "btn"]
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
                    in: ["my", "yours"]
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(2);
        expect(results).toEqual(Array.from(dom.window.document.querySelectorAll("[data-my]")));
    });

    it("by data key, not found", function() {
        const results = domQuery({
            where: {
                dataKey: {
                    in: ["uknown"]
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
                    in: ["test", "yours"]
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(2);
        expect(results).toEqual(Array.from(dom.window.document.querySelectorAll("[data-my]")));
    });

    it("by data value, not found", function() {
        const results = domQuery({
            where: {
                dataValue: {
                    in: ["uknown"]
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
                    in: ["red"]
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(6);
        expect(results).toEqual(Array.from(dom.window.document.querySelectorAll(".listValues")));
    });

    it("by style, not found", function() {
        const results = domQuery({
            where: {
                "style-color": {
                    in: ["blue"]
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeEmpty();
    });
});
