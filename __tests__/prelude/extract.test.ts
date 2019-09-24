//tslint:disable
import "jest-extended";
//tslint:enable
import http from "http";
import {getInstance, IHeadlessChrome} from "../../src/engine/browser";
import {getChromePath} from "../../src/store/chromium";
import {createStaticServer} from "../utils/startServer";
import {getRandomPort} from "../utils/getRandomPort";
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

describe("extraction tests", function() {
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
        const result = await ayakashiInstance.extract("myDiv");
        expect(result).toEqual(["hello"]);
        await ayakashiInstance.__connection.release();
    });

    test("text extraction with multiple matches", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("divs").where({class: {eq: "divs"}});
        const result = await ayakashiInstance.extract("divs");
        expect(result).toBeArrayOfSize(3);
        expect(result).toEqual(["hello", "hello2", "hello3"]);
        await ayakashiInstance.__connection.release();
    });

    test("text extraction with regex", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("divs").where({class: {eq: "divs"}});
        const result = await ayakashiInstance.extract("divs", /hello3/);
        expect(result).toBeArrayOfSize(3);
        expect(result).toEqual(["", "", "hello3"]);
        await ayakashiInstance.__connection.release();
    });

    test("text extraction with regex, extract substring", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myContentDiv").where({id: {eq: "content"}});
        const result = await ayakashiInstance.extract("myContentDiv", /hello there/);
        expect(result).toBeArrayOfSize(1);
        expect(result).toEqual(["hello there"]);
        await ayakashiInstance.__connection.release();
    });

    test("text extraction with regex and default", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("divs").where({class: {eq: "divs"}});
        const result = await ayakashiInstance.extract("divs", [/hello3/, "sorry"]);
        expect(result).toBeArrayOfSize(3);
        expect(result).toEqual(["sorry", "sorry", "hello3"]);
        await ayakashiInstance.__connection.release();
    });

    test("text extraction by attribute", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myLink").where({id: {eq: "myLink"}});
        const result = await ayakashiInstance.extract("myLink", "href");
        expect(result).toEqual(["http://example.com/"]);
        await ayakashiInstance.__connection.release();
    });

    test("text extraction by attribute and default", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myLink").where({id: {eq: "myLink"}});
        //defaults are not evaluated
        const result = await ayakashiInstance.extract("myLink", ["uknownAttribute", "href"]);
        expect(result).toEqual(["href"]);
        await ayakashiInstance.__connection.release();
    });

    test("text extraction with function", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myLink").where({id: {eq: "myLink"}});
        const result = await ayakashiInstance.extract("myLink", function(el: HTMLAnchorElement) {
            return el.href;
        });
        expect(result).toEqual(["http://example.com/"]);
        await ayakashiInstance.__connection.release();
    });

    test("integer extraction", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myNumber").where({id: {eq: "myNumber"}});
        const result = await ayakashiInstance.extract<number>("myNumber", "number");
        expect(result).toEqual([123]);
        await ayakashiInstance.__connection.release();
    });

    test("integer extraction alias", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myNumber").where({id: {eq: "myNumber"}});
        const result = await ayakashiInstance.extract<number>("myNumber", "integer");
        expect(result).toEqual([123]);
        await ayakashiInstance.__connection.release();
    });

    test("float extraction", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("pi").where({id: {eq: "pi"}});
        const result = await ayakashiInstance.extract<number>("pi", "float");
        expect(result).toEqual([3.14]);
        await ayakashiInstance.__connection.release();
    });

    test("float extraction with comma", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("piComma").where({id: {eq: "piComma"}});
        const result = await ayakashiInstance.extract<number>("piComma", "float");
        expect(result).toEqual([3.14]);
        await ayakashiInstance.__connection.release();
    });

    test("should throw if an uknown prop is used", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        expect((async function() {
            await ayakashiInstance.extract("uknownPROP");
        })()).rejects.toThrowError("<extract> needs a valid prop");
        await ayakashiInstance.__connection.release();
    });

    test("should return an empty array if prop has no matches", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myUknownDiv").where({id: {eq: "myUknownDiv"}});
        const result = await ayakashiInstance.extract("myUknownDiv");
        expect(result).toBeArrayOfSize(0);
        await ayakashiInstance.__connection.release();
    });

    test("should return an empty array if parent prop has no matches", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance
            .selectOne("aParent")
            .where({id: {eq: "uknownParent"}})
            .selectChild("myChild")
            .where({
                id: {
                    eq: "someId"
                }
            });
        const result = await ayakashiInstance.extract("myChild");
        expect(result).toEqual([]);
        await ayakashiInstance.__connection.release();
    });

    test("using a custom extractor", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        ayakashiInstance.registerExtractor("getClassName", function() {
            return {
                extract: function(element) {
                    return element.className;
                },
                isValid: function(extractorResult: string) {
                    return typeof extractorResult === "string";
                },
                useDefault: function() {
                    return "no-class";
                }
            };
        });
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myDiv").where({id: {eq: "myDiv"}});
        const result = await ayakashiInstance.extract("myDiv", "getClassName");
        expect(result).toEqual(["divs"]);
        await ayakashiInstance.__connection.release();
    });

    test("using a custom extractor with a dependency", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        ayakashiInstance.registerExtractor("myText", function() {
            const self = this;
            return {
                extract: function(element) {
                    //@ts-ignore
                    const textExtractor = self.extractors.text();
                    return textExtractor.extract(element) + "-custom";
                },
                isValid: function(extractorResult: string) {
                    return typeof extractorResult === "string";
                },
                useDefault: function() {
                    return "no-text";
                }
            };
        }, ["text"]);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myDiv").where({id: {eq: "myDiv"}});
        const result = await ayakashiInstance.extract("myDiv", "myText");
        expect(result).toEqual(["hello-custom"]);
        await ayakashiInstance.__connection.release();
    });

    test("should throw if a nested extractable is used", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myLink").where({id: {eq: "myLink"}});
        expect((async function() {
            await ayakashiInstance.extract("myLink", {
                //@ts-ignore
                myText: "text"
            });
        })()).rejects.toThrowError("Invalid extractable");
        await ayakashiInstance.__connection.release();
    });

    test("should throw if an invalid extractable is used", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myLink").where({id: {eq: "myLink"}});
        expect((async function() {
            //@ts-ignore
            await ayakashiInstance.extract("myLink", 123);
        })()).rejects.toThrowError("Invalid extractable");
        await ayakashiInstance.__connection.release();
    });

    test("should be able to extract element attributes", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myDiv").where({id: {eq: "myDiv"}});
        const result = await ayakashiInstance.extract("myDiv", "title");
        expect(result).toEqual(["a div"]);
        await ayakashiInstance.__connection.release();
    });

    test("should be able to extract data attributes, js format", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myDiv").where({id: {eq: "myDiv"}});
        const result = await ayakashiInstance.extract("myDiv", "myKey");
        expect(result).toEqual(["some value"]);
        await ayakashiInstance.__connection.release();
    });

    test("should be able to extract data attributes, html format", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myDiv").where({id: {eq: "myDiv"}});
        const result = await ayakashiInstance.extract("myDiv", "data-my-key");
        expect(result).toEqual(["some value"]);
        await ayakashiInstance.__connection.release();
    });
});
