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

describe("test optional where", function() {
    it("whole body", function() {
        const results = domQuery({}, {
            env: dom.window
        });
        expect(results).toBeArrayOfSize(5);
    });

    it("with a scope", function() {
        //@ts-ignore
        const results = domQuery({}, {
            env: dom.window,
            scope: dom.window.document.querySelector("#myList")
        });
        expect(results).toBeArrayOfSize(3);
    });
});
