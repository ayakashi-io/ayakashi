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
    <div id="theData" data-this-is-some-data="here it is"></div>
    <div id="theDataWithDashes" data-this--is--some-data="i got dashes"></div>
    <div id="theDataWithDots" data-this.is.some-data="i got dots"></div>
    <div id="theDataWithColons" data-this:is:some-data="i got colons"></div>
    <div id="theDataWithDashes2" data-this--is--some-data-="i got dashes 2"></div>
`);

describe("test eq", function() {
    test("by data attribute", function() {
        const results = domQuery({
            where: {
                "data-my": {
                    eq: "test"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toEqual(dom.window.document.querySelector("[data-my]"));
    });

    test("by data attribute, upcase", function() {
        const results = domQuery({
            where: {
                "data-this-is-some-data": {
                    eq: "here it is"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toEqual(dom.window.document.querySelector("#theData"));
    });

    test("by data attribute, upcase with extra dashes", function() {
        const results = domQuery({
            where: {
                "data-this--is--some-data": {
                    eq: "i got dashes"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toEqual(dom.window.document.querySelector("#theDataWithDashes"));
    });

    test("by data attribute, upcase with dots", function() {
        const results = domQuery({
            where: {
                "data-this.is.some-data": {
                    eq: "i got dots"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toEqual(dom.window.document.querySelector("#theDataWithDots"));
    });

    test("by data attribute, upcase with colons", function() {
        const results = domQuery({
            where: {
                "data-this:is:some-data": {
                    eq: "i got colons"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toEqual(dom.window.document.querySelector("#theDataWithColons"));
    });

    test("by data attribute, upcase with dashes 2", function() {
        const results = domQuery({
            where: {
                "data-this--is--some-data-": {
                    eq: "i got dashes 2"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toEqual(dom.window.document.querySelector("#theDataWithDashes2"));
    });
});
