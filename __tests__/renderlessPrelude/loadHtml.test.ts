//tslint:disable
import "jest-extended";
//tslint:enable
import {getAyakashiInstance} from "../utils/getRenderlessAyakashiInstance";

const someHtml = `
<html>
    <head>
        <title>test page</title>
    </head>
    <body>
        <div class="container">
            <a href="http://example.com" id="link1" class="links">Link1</a>
        </div>
        <div class="container2">
            <a href="http://example.com" id="link2" class="links">Link2</a>
        </div>
        <div class="container3">
            <span>hello</span>
            <span>hello2</span>
            <span>hello3</span>
        </div>
        <div class="container4">
            <div class="wrapper">
                <span>hello</span>
                <label>a label</label>
            </div>
            <div class="wrapper2">
                <span>hello2</span>
            </div>
        </div>
    </body>
</html>
`;

const someHtmlFragment = `
    <div class="container">
        <a href="http://example.com" id="link1" class="links">Link1</a>
    </div>
    <div class="container2">
        <a href="http://example.com" id="link2" class="links">Link2</a>
    </div>
`;

describe("loadHtml() tests", function() {

    test("create some props and extract them", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.loadHtml(someHtml);
        ayakashiInstance.select("links").where({tagName: {eq: "A"}});
        const result = await ayakashiInstance.extract("links", "id");
        expect(result).toEqual([{
            links: "link1"
        }, {
            links: "link2"
        }]);
        await ayakashiInstance.__connection.release();
    });

    test("create some props and extract them, on an html fragment", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.loadHtml(someHtmlFragment);
        ayakashiInstance.select("links").where({tagName: {eq: "A"}});
        const result = await ayakashiInstance.extract("links", "id");
        expect(result).toEqual([{
            links: "link1"
        }, {
            links: "link2"
        }]);
        await ayakashiInstance.__connection.release();
    });
});
