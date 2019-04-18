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

describe("test order: desc recursive", function() {
    it("with order: desc", function() {
        const results = domQuery({
            where: {
                className: {
                    eq: "listValues"
                }
            },
            order: "desc"
        }, {
            env: dom.window
        });
        expect(results).toEqual(Array.from(dom.window.document.querySelectorAll(".listValues")).reverse());
    });

    it("with order: desc and limit", function() {
        const results = domQuery({
            where: {
                className: {
                    eq: "listValues"
                }
            },
            order: "desc",
            limit: 1
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toEqual(Array.from(dom.window.document.querySelectorAll(".listValues")).reverse()[0]);
    });

    it("with order: desc and skip", function() {
        const results = domQuery({
            where: {
                className: {
                    eq: "listValues"
                }
            },
            order: "desc",
            skip: 2
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toEqual(Array.from(dom.window.document.querySelectorAll(".listValues")).reverse()[2]);
    });

    it("with order: desc and limit and skip", function() {
        const results = domQuery({
            where: {
                className: {
                    eq: "listValues"
                }
            },
            order: "desc",
            skip: 1,
            limit: 1
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toEqual(Array.from(dom.window.document.querySelectorAll(".listValues")).reverse()[1]);
    });
});

describe("test order: desc non-recursive", function() {
    it("with order: desc, recursive: false", function() {
        const results = domQuery({
            where: {
                className: {
                    eq: "listValues"
                }
            },
            order: "desc"
        }, {
            env: dom.window,
            recursive: false
        });
        expect(results).toEqual(Array.from(dom.window.document.querySelectorAll(".listValues")).reverse());
    });

    it("with order: desc and limit, recursive: false", function() {
        const results = domQuery({
            where: {
                className: {
                    eq: "listValues"
                }
            },
            order: "desc",
            limit: 1
        }, {
            env: dom.window,
            recursive: false
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toEqual(Array.from(dom.window.document.querySelectorAll(".listValues")).reverse()[0]);
    });

    it("with order: desc and skip, recursive: false", function() {
        const results = domQuery({
            where: {
                className: {
                    eq: "listValues"
                }
            },
            order: "desc",
            skip: 2
        }, {
            env: dom.window,
            recursive: false
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toEqual(Array.from(dom.window.document.querySelectorAll(".listValues")).reverse()[2]);
    });

    it("with order: desc and limit and skip, recursive: false", function() {
        const results = domQuery({
            where: {
                className: {
                    eq: "listValues"
                }
            },
            order: "desc",
            skip: 1,
            limit: 1
        }, {
            env: dom.window,
            recursive: false
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toEqual(Array.from(dom.window.document.querySelectorAll(".listValues")).reverse()[1]);
    });
});
