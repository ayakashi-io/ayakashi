//tslint:disable
import "jest-extended";
import {JSDOM} from "jsdom";
//tslint:enable

import {domQuery} from "../../src/domQL/domQL";

const dom = new JSDOM(`
    <style>
        .styled {
            color: #fff;
        }
        .styledWithAlpha {
            background-color: rgba(71, 178, 220, 0.81);
        }
        .literalStyled {
            color: red
        }
    </style>
    <div class="styled" id="myStyledDiv">
        hello
    </div>
    <div class="styledWithAlpha" id="myStyledDiv2">
        hello
    </div>
    <div class="literalStyled" id="myStyledDiv3">
        hello
    </div>
`);

describe("test color style queries", function() {
    it("can query by hex color", function() {
        const results = domQuery({
            where: {
                "style-color": {
                    eq: "#fff"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toBe(dom.window.document.getElementById("myStyledDiv"));
    });

    it("can query by hex color (full)", function() {
        const results = domQuery({
            where: {
                "style-color": {
                    eq: "#ffffff"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toBe(dom.window.document.getElementById("myStyledDiv"));
    });

    it("can query by rgb color", function() {
        const results = domQuery({
            where: {
                "style-color": {
                    eq: "rgb(255, 255, 255)"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toBe(dom.window.document.getElementById("myStyledDiv"));
    });

    it("can query by rgb color (formatting)", function() {
        const results = domQuery({
            where: {
                "style-color": {
                    eq: "rgb(255,255,255)"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toBe(dom.window.document.getElementById("myStyledDiv"));
    });

    it("can query by rgba color", function() {
        const results = domQuery({
            where: {
                "style-background-color": {
                    eq: "rgba(71, 178, 220, 0.81)"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toBe(dom.window.document.getElementById("myStyledDiv2"));
    });

    it("can query by rgba color (formatting)", function() {
        const results = domQuery({
            where: {
                "style-background-color": {
                    eq: "rgba(71,178,220, 0.81)"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toBe(dom.window.document.getElementById("myStyledDiv2"));
    });

    it("can query by literal color", function() {
        const results = domQuery({
            where: {
                "style-color": {
                    eq: "red"
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toBe(dom.window.document.getElementById("myStyledDiv3"));
    });

    it("can query with an array of colors (in)", function() {
        const results = domQuery({
            where: {
                "style-color": {
                    in: ["red", "blue"]
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toBe(dom.window.document.getElementById("myStyledDiv3"));
    });

    it("can query with an array of colors ($nin)", function() {
        const results = domQuery({
            where: {
                "style-color": {
                    $nin: ["#fff"]
                }
            }
        }, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(1);
        expect(results[0]).toBe(dom.window.document.getElementById("myStyledDiv3"));
    });
});
