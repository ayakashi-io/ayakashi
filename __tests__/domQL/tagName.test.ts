//tslint:disable
import "jest-extended";
import {JSDOM} from "jsdom";
//tslint:enable

import {domQuery} from "../../src/domQL/domQL";

const dom = new JSDOM(`
    <div id="theDiv">hello</div>
`);

describe("test tagName", function() {
    test("uppercase", function() {
        const results = domQuery({
            where: {
                tagName: {
                    eq: "DIV"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(2);
        expect(results[0]).toBe(dom.window.document.getElementById("theDiv"));
    });

    test("lowercase", function() {
        const results = domQuery({
            where: {
                tagName: {
                    eq: "div"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toBe(dom.window.document.getElementById("theDiv"));
    });

    test("mixcase", function() {
        const results = domQuery({
            where: {
                tagName: {
                    eq: "Div"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toBe(dom.window.document.getElementById("theDiv"));
    });

    test("with like", function() {
        const results = domQuery({
            where: {
                tagName: {
                    like: "d"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toBe(dom.window.document.getElementById("theDiv"));
    });

    test("with like regex", function() {
        const results = domQuery({
            where: {
                tagName: {
                    like: /d/
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toBe(dom.window.document.getElementById("theDiv"));
    });

    test("with $nlike regex", function() {
        const results = domQuery({
            where: {
                tagName: {
                    $nlike: /d/
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(0);
    });

});
