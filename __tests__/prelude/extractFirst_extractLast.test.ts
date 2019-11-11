//tslint:disable
import "jest-extended";
//tslint:enable
import http from "http";
import {getInstance, IHeadlessChrome} from "../../src/engine/browser";
import {getChromePath} from "../../src/store/chromium";
import {createStaticServer} from "../utils/startServer";
import {getRandomPort} from "../../src/utils/getRandomPort";
import {getAyakashiInstance} from "../utils/getAyakashiInstance";
import {startBridge} from "../../src/bridge/bridge";
import {addConnectionRoutes} from "../../src/bridge/connection";

let staticServerPort: number;
let staticServer: http.Server;

let headlessChrome: IHeadlessChrome;
let bridgePort: number;
let protocolPort: number;
let closeBridge: () => Promise<void>;

jest.setTimeout(600000);
process.setMaxListeners(100);

describe("extraction tests for extractFirst/extractLast", function() {
    let chromePath: string;
    beforeAll(async function() {
        chromePath = await getChromePath();
        staticServerPort = await getRandomPort();
        staticServer = createStaticServer(staticServerPort,
            `
            <html>
                <head>
                    <title>test page</title>
                </head>
                <body>
                    <div id="myDiv" class="divs" title="a div" data-my-key="some value">hello</div>
                    <div class="divs">hello2</div>
                    <div class="divs">hello3</div>
                    <a href="http://example.com" id="myLink">Link</a>
                    <span id="myNumber">123</span>
                    <span id="pi">3.14</span>
                    <span id="piComma">3,14</span>
                    <a href="http://example.com" id="link2" class="links">Link2</a>
                    <div id="content">Here is my content: hello there</div>
                </body>
            </html>
            `
        );
    });
    beforeEach(async function() {
        headlessChrome = getInstance();
        bridgePort = await getRandomPort();
        protocolPort = await getRandomPort();
        const b = await startBridge(bridgePort);
        closeBridge = b.closeBridge;
        addConnectionRoutes(b.bridge, headlessChrome);
        await headlessChrome.init({
            chromePath: chromePath,
            protocolPort: protocolPort
        });
    });

    afterEach(async function() {
        await headlessChrome.close();
        await closeBridge();
    });

    afterAll(function(done) {
        staticServer.close(function() {
            done();
        });
    });

    test("text extraction", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myDiv").where({id: {eq: "myDiv"}});
        const result = await ayakashiInstance.extractFirst("myDiv");
        expect(result).toEqual("hello");
        await ayakashiInstance.__connection.release();
    });

    test("text extraction with multiple matches, extractFirst", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("divs").where({class: {eq: "divs"}});
        const result = await ayakashiInstance.extractFirst("divs");
        expect(result).toEqual("hello");
        await ayakashiInstance.__connection.release();
    });

    test("text extraction with multiple matches, extractLast", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("divs").where({class: {eq: "divs"}});
        const result = await ayakashiInstance.extractLast("divs");
        expect(result).toEqual("hello3");
        await ayakashiInstance.__connection.release();
    });

    test("text extraction with regex, extractFirst", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("divs").where({class: {eq: "divs"}});
        const result = await ayakashiInstance.extractFirst("divs", /hello3/);
        expect(result).toEqual("");
        await ayakashiInstance.__connection.release();
    });

    test("text extraction with regex, extractLast", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("divs").where({class: {eq: "divs"}});
        const result = await ayakashiInstance.extractLast("divs", /hello3/);
        expect(result).toEqual("hello3");
        await ayakashiInstance.__connection.release();
    });

    test("text extraction with regex and default, extractFirst", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("divs").where({class: {eq: "divs"}});
        const result = await ayakashiInstance.extractFirst("divs", [/hello3/, "sorry"]);
        expect(result).toEqual("sorry");
        await ayakashiInstance.__connection.release();
    });

    test("text extraction with regex and default, extractLast", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("divs").where({class: {eq: "divs"}});
        const result = await ayakashiInstance.extractLast("divs", [/hello3/, "sorry"]);
        expect(result).toEqual("hello3");
        await ayakashiInstance.__connection.release();
    });

    test("text extraction by attribute, extractFirst", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myLink").where({id: {eq: "myLink"}});
        const result = await ayakashiInstance.extractFirst("myLink", "href");
        expect(result).toEqual("http://example.com/");
        await ayakashiInstance.__connection.release();
    });

    test("text extraction by attribute, extractLast", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myLink").where({id: {eq: "myLink"}});
        const result = await ayakashiInstance.extractLast("myLink", "href");
        expect(result).toEqual("http://example.com/");
        await ayakashiInstance.__connection.release();
    });

    test("text extraction by attribute and default, extractFirst", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myLink").where({id: {eq: "myLink"}});
        //defaults are not evaluated
        const result = await ayakashiInstance.extractFirst("myLink", ["uknownAttribute", "href"]);
        expect(result).toEqual("href");
        await ayakashiInstance.__connection.release();
    });

    test("text extraction by attribute and default, extractLast", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myLink").where({id: {eq: "myLink"}});
        //defaults are not evaluated
        const result = await ayakashiInstance.extractLast("myLink", ["uknownAttribute", "href"]);
        expect(result).toEqual("href");
        await ayakashiInstance.__connection.release();
    });

    test("text extraction with function, extractFirst", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myLink").where({id: {eq: "myLink"}});
        const result = await ayakashiInstance.extractFirst("myLink", function(el) {
            return (<HTMLAnchorElement>el).href;
        });
        expect(result).toEqual("http://example.com/");
        await ayakashiInstance.__connection.release();
    });

    test("text extraction with function, extractLast", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myLink").where({id: {eq: "myLink"}});
        const result = await ayakashiInstance.extractLast("myLink", function(el) {
            return (<HTMLAnchorElement>el).href;
        });
        expect(result).toEqual("http://example.com/");
        await ayakashiInstance.__connection.release();
    });

    test("integer extraction, extractFirst", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myNumber").where({id: {eq: "myNumber"}});
        const result = await ayakashiInstance.extractFirst<number>("myNumber", "number");
        expect(result).toEqual(123);
        await ayakashiInstance.__connection.release();
    });

    test("integer extraction, extractLast", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myNumber").where({id: {eq: "myNumber"}});
        const result = await ayakashiInstance.extractLast<number>("myNumber", "number");
        expect(result).toEqual(123);
        await ayakashiInstance.__connection.release();
    });

    test("should throw if an uknown prop is used, extractFirst", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        expect((async function() {
            await ayakashiInstance.extractFirst("uknownPROP");
        })()).rejects.toThrowError("<extractFirst> needs a valid prop");
        await ayakashiInstance.__connection.release();
    });

    test("should throw if an uknown prop is used, extractLast", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        expect((async function() {
            await ayakashiInstance.extractLast("uknownPROP");
        })()).rejects.toThrowError("<extractLast> needs a valid prop");
        await ayakashiInstance.__connection.release();
    });

    test("should return null if prop has no matches, extractFirst", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myUknownDiv").where({id: {eq: "myUknownDiv"}});
        const result = await ayakashiInstance.extractFirst("myUknownDiv");
        expect(result).toBeNull();
        await ayakashiInstance.__connection.release();
    });

    test("should return null if prop has no matches, extractLast", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myUknownDiv").where({id: {eq: "myUknownDiv"}});
        const result = await ayakashiInstance.extractLast("myUknownDiv");
        expect(result).toBeNull();
        await ayakashiInstance.__connection.release();
    });

    test("should be able to extract element attributes", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myDiv").where({id: {eq: "myDiv"}});
        const result = await ayakashiInstance.extractFirst("myDiv", "title");
        expect(result).toEqual("a div");
        await ayakashiInstance.__connection.release();
    });

    test("should be able to extract data attributes, js format", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myDiv").where({id: {eq: "myDiv"}});
        const result = await ayakashiInstance.extractLast("myDiv", "myKey");
        expect(result).toEqual("some value");
        await ayakashiInstance.__connection.release();
    });

    test("should be able to extract data attributes, html format", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myDiv").where({id: {eq: "myDiv"}});
        const result = await ayakashiInstance.extractFirst("myDiv", "data-my-key");
        expect(result).toEqual("some value");
        await ayakashiInstance.__connection.release();
    });
});
