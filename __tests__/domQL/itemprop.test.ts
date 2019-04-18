//tslint:disable
import "jest-extended";
import {JSDOM} from "jsdom";
//tslint:enable

import {domQuery} from "../../src/domQL/domQL";

const dom = new JSDOM(`
    <div itemprop="about" id="theDiv">about me</div>
`);

describe("test itemprop", function() {
    it("eq", function() {
        const results = domQuery({
            where: {
                itemprop: {
                    eq: "about"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toBe(dom.window.document.getElementById("theDiv"));
    });

    it("like", function() {
        const results = domQuery({
            where: {
                itemprop: {
                    like: "ab"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toBe(dom.window.document.getElementById("theDiv"));
    });

    it("eq not found", function() {
        const results = domQuery({
            where: {
                itemprop: {
                    eq: "not_found"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(0);
    });

});
