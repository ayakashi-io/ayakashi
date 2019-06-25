//tslint:disable
import "jest-extended";
//tslint:enable
import http from "http";
import {getInstance, IHeadlessChrome} from "../../src/engine/browser";
import {getChromePath} from "../../src/store/chromium";
import {createStaticServer} from "../utils/startServer";
import {getRandomPort} from "../utils/getRandomPort";
import {getAyakashiInstance} from "../utils/getAyakashiInstance";

let staticServerPort: number;
let staticServer: http.Server;

let headlessChrome: IHeadlessChrome;
let bridgePort: number;
let protocolPort: number;

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
                    <div id="myDiv" class="divs">hello</div>
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
        await headlessChrome.init({
            chromePath: chromePath,
            bridgePort: bridgePort,
            protocolPort: protocolPort
        });
    });

    afterEach(async function() {
        await headlessChrome.close();
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
        expect(result).toEqual([{myDiv: "hello"}]);
        await ayakashiInstance.__connection.release();
    });

    test("text extraction with multiple matches", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("divs").where({class: {eq: "divs"}});
        const result = await ayakashiInstance.extract("divs");
        expect(result).toBeArrayOfSize(3);
        expect(result).toEqual([{divs: "hello"}, {divs: "hello2"}, {divs: "hello3"}]);
        await ayakashiInstance.__connection.release();
    });

    test("text extraction wrapped", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myDiv").where({id: {eq: "myDiv"}});
        const result = await ayakashiInstance.extract("myDiv", {
            greeting: "text"
        });
        expect(result).toEqual([{greeting: "hello"}]);
        await ayakashiInstance.__connection.release();
    });

    test("text extraction wrapped nested", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myDiv").where({id: {eq: "myDiv"}});
        const result = await ayakashiInstance.extract("myDiv", {
            greeting: {
                myGreeting: "text"
            }
        });
        expect(result).toEqual([{greeting: {myGreeting: "hello"}}]);
        await ayakashiInstance.__connection.release();
    });

    test("text extraction with multiple matches wrapped", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("divs").where({class: {eq: "divs"}});
        const result = await ayakashiInstance.extract("divs", {
            greeting: "text"
        });
        expect(result).toBeArrayOfSize(3);
        expect(result).toEqual([{greeting: "hello"}, {greeting: "hello2"}, {greeting: "hello3"}]);
        await ayakashiInstance.__connection.release();
    });

    test("text extraction with multiple matches wrapped nested", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("divs").where({class: {eq: "divs"}});
        const result = await ayakashiInstance.extract("divs", {
            greeting: {
                myGreeting: "text"
            }
        });
        expect(result).toBeArrayOfSize(3);
        expect(result).toEqual([
            {greeting: {myGreeting: "hello"}},
            {greeting: {myGreeting: "hello2"}},
            {greeting: {myGreeting: "hello3"}}
        ]);
        await ayakashiInstance.__connection.release();
    });

    test("text extraction with regex", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("divs").where({class: {eq: "divs"}});
        const result = await ayakashiInstance.extract("divs", /hello3/);
        expect(result).toBeArrayOfSize(3);
        expect(result).toEqual([{divs: ""}, {divs: ""}, {divs: "hello3"}]);
        await ayakashiInstance.__connection.release();
    });

    test("text extraction with regex, extract substring", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myContentDiv").where({id: {eq: "content"}});
        const result = await ayakashiInstance.extract("myContentDiv", /hello there/);
        expect(result).toBeArrayOfSize(1);
        expect(result).toEqual([{myContentDiv: "hello there"}]);
        await ayakashiInstance.__connection.release();
    });

    test("text extraction with regex wrapped", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("divs").where({class: {eq: "divs"}});
        const result = await ayakashiInstance.extract("divs", {
            greeting: /hello3/
        });
        expect(result).toBeArrayOfSize(3);
        expect(result).toEqual([{greeting: ""}, {greeting: ""}, {greeting: "hello3"}]);
        await ayakashiInstance.__connection.release();
    });

    test("text extraction with regex wrapped nested", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("divs").where({class: {eq: "divs"}});
        const result = await ayakashiInstance.extract("divs", {
            greeting: {
                myGreeting: /hello3/
            }
        });
        expect(result).toBeArrayOfSize(3);
        expect(result).toEqual([
            {greeting: {myGreeting: ""}},
            {greeting: {myGreeting: ""}},
            {greeting: {myGreeting: "hello3"}}
        ]);
        await ayakashiInstance.__connection.release();
    });

    test("text extraction with regex and default", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("divs").where({class: {eq: "divs"}});
        const result = await ayakashiInstance.extract("divs", [/hello3/, "sorry"]);
        expect(result).toBeArrayOfSize(3);
        expect(result).toEqual([{divs: "sorry"}, {divs: "sorry"}, {divs: "hello3"}]);
        await ayakashiInstance.__connection.release();
    });

    test("text extraction with regex and default wrapped", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("divs").where({class: {eq: "divs"}});
        const result = await ayakashiInstance.extract("divs", {
            greeting: [/hello3/, "sorry"]
        });
        expect(result).toBeArrayOfSize(3);
        expect(result).toEqual([{greeting: "sorry"}, {greeting: "sorry"}, {greeting: "hello3"}]);
        await ayakashiInstance.__connection.release();
    });

    test("text extraction with regex and default wrapped nested", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("divs").where({class: {eq: "divs"}});
        const result = await ayakashiInstance.extract("divs", {
            greeting: {
                myGreeting: [/hello3/, "sorry"]
            }
        });
        expect(result).toBeArrayOfSize(3);
        expect(result).toEqual([
            {greeting: {myGreeting: "sorry"}},
            {greeting: {myGreeting: "sorry"}},
            {greeting: {myGreeting: "hello3"}}
        ]);
        await ayakashiInstance.__connection.release();
    });

    test("text extraction by attribute", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myLink").where({id: {eq: "myLink"}});
        const result = await ayakashiInstance.extract("myLink", "href");
        expect(result).toEqual([{myLink: "http://example.com/"}]);
        await ayakashiInstance.__connection.release();
    });

    test("text extraction by attribute and default", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myLink").where({id: {eq: "myLink"}});
        //defaults are not evaluated
        const result = await ayakashiInstance.extract("myLink", ["uknownAttribute", "href"]);
        expect(result).toEqual([{myLink: "href"}]);
        await ayakashiInstance.__connection.release();
    });

    test("text extraction by attribute wrapped", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myLink").where({id: {eq: "myLink"}});
        const result = await ayakashiInstance.extract("myLink", {
            link: "href"
        });
        expect(result).toEqual([{link: "http://example.com/"}]);
        await ayakashiInstance.__connection.release();
    });

    test("text extraction by attribute wrapped nested", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myLink").where({id: {eq: "myLink"}});
        const result = await ayakashiInstance.extract("myLink", {
            link: {
                theLink: "href"
            }
        });
        expect(result).toEqual([{link: {theLink: "http://example.com/"}}]);
        await ayakashiInstance.__connection.release();
    });

    test("text extraction with function", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myLink").where({id: {eq: "myLink"}});
        const result = await ayakashiInstance.extract("myLink", function(el: HTMLAnchorElement) {
            return el.href;
        });
        expect(result).toEqual([{myLink: "http://example.com/"}]);
        await ayakashiInstance.__connection.release();
    });

    test("text extraction with function wrapped", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myLink").where({id: {eq: "myLink"}});
        const result = await ayakashiInstance.extract("myLink", {
            link: function(el: HTMLAnchorElement) {
                return el.href;
            }
        });
        expect(result).toEqual([{link: "http://example.com/"}]);
        await ayakashiInstance.__connection.release();
    });

    test("text extraction with function wrapped nested", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myLink").where({id: {eq: "myLink"}});
        const result = await ayakashiInstance.extract("myLink", {
            link: {
                theLink: function(el: HTMLAnchorElement) {
                    return el.href;
                }
            }
        });
        expect(result).toEqual([{link: {theLink: "http://example.com/"}}]);
        await ayakashiInstance.__connection.release();
    });

    test("integer extraction", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myNumber").where({id: {eq: "myNumber"}});
        const result = await ayakashiInstance.extract("myNumber", "number");
        expect(result).toEqual([{myNumber: 123}]);
        await ayakashiInstance.__connection.release();
    });

    test("integer extraction alias", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myNumber").where({id: {eq: "myNumber"}});
        const result = await ayakashiInstance.extract("myNumber", "integer");
        expect(result).toEqual([{myNumber: 123}]);
        await ayakashiInstance.__connection.release();
    });

    test("float extraction", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("pi").where({id: {eq: "pi"}});
        const result = await ayakashiInstance.extract("pi", "float");
        expect(result).toEqual([{pi: 3.14}]);
        await ayakashiInstance.__connection.release();
    });

    test("float extraction with comma", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("piComma").where({id: {eq: "piComma"}});
        const result = await ayakashiInstance.extract("piComma", "float");
        expect(result).toEqual([{piComma: 3.14}]);
        await ayakashiInstance.__connection.release();
    });

    test("text extraction wrapped mixed", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("link").where({id: {eq: "link2"}});
        const result = await ayakashiInstance.extract("link", {
            link: {
                href: "href",
                href2: function(el: HTMLAnchorElement) {
                    return el.href;
                },
                myText: "text",
                myText2: /Link/,
                myDefaultText: [/nope/, "oops"]
            }
        });
        expect(result).toEqual([{
            link: {
                href: "http://example.com/",
                href2: "http://example.com/",
                myText: "Link2",
                myText2: "Link",
                myDefaultText: "oops"
            }
        }]);
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
});
