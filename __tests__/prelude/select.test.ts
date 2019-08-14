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

describe("select tests", function() {
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

    test("select all", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("links").where({tagName: {eq: "A"}});
        const result = await ayakashiInstance.extract("links", "id");
        expect(result).toEqual(["link1", "link2"]);
        await ayakashiInstance.__connection.release();
    });

    test("selectOne", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("links").where({tagName: {eq: "A"}});
        const result = await ayakashiInstance.extract("links", "id");
        expect(result).toEqual(["link1"]);
        await ayakashiInstance.__connection.release();
    });

    test("selectFirst", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectFirst("links").where({tagName: {eq: "A"}});
        const result = await ayakashiInstance.extract("links", "id");
        expect(result).toEqual(["link1"]);
        await ayakashiInstance.__connection.release();
    });

    test("selectLast", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectLast("links").where({tagName: {eq: "A"}});
        const result = await ayakashiInstance.extract("links", "id");
        expect(result).toEqual(["link2"]);
        await ayakashiInstance.__connection.release();
    });

    test("select all in parent", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("container").where({class: {eq: "container3"}});
        ayakashiInstance.select("spans").where({tagName: {eq: "SPAN"}}).from("container");
        const result = await ayakashiInstance.extract("spans", "text");
        expect(result).toEqual(["hello", "hello2", "hello3"]);
        await ayakashiInstance.__connection.release();
    });

    test("select first in parent", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("container").where({class: {eq: "container3"}});
        ayakashiInstance.selectFirst("spans").where({tagName: {eq: "SPAN"}}).from("container");
        const result = await ayakashiInstance.extract("spans", "text");
        expect(result).toEqual(["hello"]);
        await ayakashiInstance.__connection.release();
    });

    test("select first in parent with order desc", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("container").where({class: {eq: "container3"}});
        ayakashiInstance
        .select("spans")
        .where({tagName: {eq: "SPAN"}})
        .from("container")
        .skip(2)
        .limit(1)
        .order("desc");
        const result = await ayakashiInstance.extract("spans", "text");
        expect(result).toEqual(["hello"]);
        await ayakashiInstance.__connection.release();
    });

    test("select second in parent", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("container").where({class: {eq: "container3"}});
        ayakashiInstance.selectOne("spans").where({tagName: {eq: "SPAN"}}).from("container").skip(1);
        const result = await ayakashiInstance.extract("spans", "text");
        expect(result).toEqual(["hello2"]);
        await ayakashiInstance.__connection.release();
    });

    test("select second in parent with order desc", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("container").where({class: {eq: "container3"}});
        ayakashiInstance
        .select("spans")
        .where({tagName: {eq: "SPAN"}})
        .from("container")
        .skip(1)
        .limit(1)
        .order("desc");
        const result = await ayakashiInstance.extract("spans", "text");
        expect(result).toEqual(["hello2"]);
        await ayakashiInstance.__connection.release();
    });

    test("select last in parent", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("container").where({class: {eq: "container3"}});
        ayakashiInstance.selectLast("spans").where({tagName: {eq: "SPAN"}}).from("container");
        const result = await ayakashiInstance.extract("spans", "text");
        expect(result).toEqual(["hello3"]);
        await ayakashiInstance.__connection.release();
    });

    test("select last in parent with order desc", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("container").where({class: {eq: "container3"}});
        ayakashiInstance.select("spans").where({tagName: {eq: "SPAN"}}).from("container").order("desc").limit(1);
        const result = await ayakashiInstance.extract("spans", "text");
        expect(result).toEqual(["hello3"]);
        await ayakashiInstance.__connection.release();
    });

    test("select all in parent with chaining", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance
        .select()
        .where({class: {eq: "container3"}})
        .selectChildren("spans")
            .where({tagName: {eq: "SPAN"}});
        const result = await ayakashiInstance.extract("spans", "text");
        expect(result).toEqual(["hello", "hello2", "hello3"]);
        await ayakashiInstance.__connection.release();
    });

    test("select first in parent with chaining", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance
        .select()
        .where({class: {eq: "container3"}})
        .selectFirstChild("spans")
            .where({tagName: {eq: "SPAN"}});
        const result = await ayakashiInstance.extract("spans", "text");
        expect(result).toEqual(["hello"]);
        await ayakashiInstance.__connection.release();
    });

    test("select first in parent with chaining and order desc", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance
        .select()
        .where({class: {eq: "container3"}})
        .selectChildren("spans")
            .where({tagName: {eq: "SPAN"}})
            .limit(1)
            .skip(2)
            .order("desc");
        const result = await ayakashiInstance.extract("spans", "text");
        expect(result).toEqual(["hello"]);
        await ayakashiInstance.__connection.release();
    });

    test("select second in parent with chaining", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance
        .select()
        .where({class: {eq: "container3"}})
        .selectFirstChild("spans")
            .where({tagName: {eq: "SPAN"}})
            .skip(1);
        const result = await ayakashiInstance.extract("spans", "text");
        expect(result).toEqual(["hello2"]);
        await ayakashiInstance.__connection.release();
    });

    test("select second in parent with chaining and order desc", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance
        .select()
        .where({class: {eq: "container3"}})
        .selectChildren("spans")
            .where({tagName: {eq: "SPAN"}})
            .limit(1)
            .skip(1)
            .order("desc");
        const result = await ayakashiInstance.extract("spans", "text");
        expect(result).toEqual(["hello2"]);
        await ayakashiInstance.__connection.release();
    });

    test("select last in parent with chaining", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance
        .select()
        .where({class: {eq: "container3"}})
        .selectLastChild("spans")
            .where({tagName: {eq: "SPAN"}});
        const result = await ayakashiInstance.extract("spans", "text");
        expect(result).toEqual(["hello3"]);
        await ayakashiInstance.__connection.release();
    });

    test("select last in parent with chaining and order desc", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance
        .select()
        .where({class: {eq: "container3"}})
        .selectChildren("spans")
            .where({tagName: {eq: "SPAN"}})
            .limit(1)
            .order("desc");
        const result = await ayakashiInstance.extract("spans", "text");
        expect(result).toEqual(["hello3"]);
        await ayakashiInstance.__connection.release();
    });

    test("select first in parent with double-chaining", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance
        .select()
        .where({class: {eq: "container4"}})
        .selectChildren()
            .where({class: {eq: "wrapper"}})
            .selectFirstChild("labels")
                .where({tagName: {eq: "LABEL"}});
        const result = await ayakashiInstance.extract("labels", "text");
        expect(result).toEqual(["a label"]);
        await ayakashiInstance.__connection.release();
    });

    test("should throw if an uknown prop is used as parent", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        expect(function() {
            ayakashiInstance.selectFirst("spans").where({tagName: {eq: "SPAN"}}).from("uknownContainer");
        }).toThrowError("Uknown parent prop : uknownContainer");
        await ayakashiInstance.__connection.release();
    });

    test("hasMatches() should return false if an uknown prop is used as parent", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        const myProp = ayakashiInstance
            .selectOne("aParent")
            .where({id: {eq: "uknownParent"}})
            .selectChild("myChild")
            .where({
                id: {
                    eq: "someId"
                }
            });
        const result = await myProp.hasMatches();
        expect(result).toBe(false);
        await ayakashiInstance.__connection.release();
    });
});
