//tslint:disable
import "jest-extended";
//tslint:enable
import http from "http";
import {createStaticServer} from "../utils/startServer";
import {getRandomPort} from "../utils/getRandomPort";
import {getAyakashiInstance} from "../utils/getRenderlessAyakashiInstance";

let staticServerPort: number;
let staticServer: http.Server;

jest.setTimeout(600000);

describe("select tests", function() {
    beforeAll(async function() {
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

    afterAll(function(done) {
        staticServer.close(function() {
            done();
        });
    });

    test("select all", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("links").where({tagName: {eq: "A"}});
        const result = await ayakashiInstance.extract("links", "id");
        expect(result).toEqual([{
            links: "link1"
        }, {
            links: "link2"
        }]);
        await ayakashiInstance.__connection.release();
    });

    test("selectOne", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("links").where({tagName: {eq: "A"}});
        const result = await ayakashiInstance.extract("links", "id");
        expect(result).toEqual([{
            links: "link1"
        }]);
        await ayakashiInstance.__connection.release();
    });

    test("selectFirst", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectFirst("links").where({tagName: {eq: "A"}});
        const result = await ayakashiInstance.extract("links", "id");
        expect(result).toEqual([{
            links: "link1"
        }]);
        await ayakashiInstance.__connection.release();
    });

    test("selectLast", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectLast("links").where({tagName: {eq: "A"}});
        const result = await ayakashiInstance.extract("links", "id");
        expect(result).toEqual([{
            links: "link2"
        }]);
        await ayakashiInstance.__connection.release();
    });

    test("select all in parent", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("container").where({class: {eq: "container3"}});
        ayakashiInstance.select("spans").where({tagName: {eq: "SPAN"}}).from("container");
        const result = await ayakashiInstance.extract("spans", "text");
        expect(result).toEqual([{
            spans: "hello"
        }, {
            spans: "hello2"
        }, {
            spans: "hello3"
        }]);
        await ayakashiInstance.__connection.release();
    });

    test("select first in parent", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("container").where({class: {eq: "container3"}});
        ayakashiInstance.selectFirst("spans").where({tagName: {eq: "SPAN"}}).from("container");
        const result = await ayakashiInstance.extract("spans", "text");
        expect(result).toEqual([{
            spans: "hello"
        }]);
        await ayakashiInstance.__connection.release();
    });

    test("select first in parent with order desc", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("container").where({class: {eq: "container3"}});
        ayakashiInstance
        .select("spans")
        .where({tagName: {eq: "SPAN"}})
        .from("container")
        .skip(2)
        .limit(1)
        .order("desc");
        const result = await ayakashiInstance.extract("spans", "text");
        expect(result).toEqual([{
            spans: "hello"
        }]);
        await ayakashiInstance.__connection.release();
    });

    test("select second in parent", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("container").where({class: {eq: "container3"}});
        ayakashiInstance.selectOne("spans").where({tagName: {eq: "SPAN"}}).from("container").skip(1);
        const result = await ayakashiInstance.extract("spans", "text");
        expect(result).toEqual([{
            spans: "hello2"
        }]);
        await ayakashiInstance.__connection.release();
    });

    test("select second in parent with order desc", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("container").where({class: {eq: "container3"}});
        ayakashiInstance
        .select("spans")
        .where({tagName: {eq: "SPAN"}})
        .from("container")
        .skip(1)
        .limit(1)
        .order("desc");
        const result = await ayakashiInstance.extract("spans", "text");
        expect(result).toEqual([{
            spans: "hello2"
        }]);
        await ayakashiInstance.__connection.release();
    });

    test("select last in parent", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("container").where({class: {eq: "container3"}});
        ayakashiInstance.selectLast("spans").where({tagName: {eq: "SPAN"}}).from("container");
        const result = await ayakashiInstance.extract("spans", "text");
        expect(result).toEqual([{
            spans: "hello3"
        }]);
        await ayakashiInstance.__connection.release();
    });

    test("select last in parent with order desc", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("container").where({class: {eq: "container3"}});
        ayakashiInstance.select("spans").where({tagName: {eq: "SPAN"}}).from("container").order("desc").limit(1);
        const result = await ayakashiInstance.extract("spans", "text");
        expect(result).toEqual([{
            spans: "hello3"
        }]);
        await ayakashiInstance.__connection.release();
    });

    test("select all in parent with chaining", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        ayakashiInstance
        .select()
        .where({class: {eq: "container3"}})
        .selectChildren("spans")
            .where({tagName: {eq: "SPAN"}});
        const result = await ayakashiInstance.extract("spans", "text");
        expect(result).toEqual([{
            spans: "hello"
        }, {
            spans: "hello2"
        }, {
            spans: "hello3"
        }]);
        await ayakashiInstance.__connection.release();
    });

    test("select first in parent with chaining", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        ayakashiInstance
        .select()
        .where({class: {eq: "container3"}})
        .selectFirstChild("spans")
            .where({tagName: {eq: "SPAN"}});
        const result = await ayakashiInstance.extract("spans", "text");
        expect(result).toEqual([{
            spans: "hello"
        }]);
        await ayakashiInstance.__connection.release();
    });

    test("select first in parent with chaining and order desc", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        ayakashiInstance
        .select()
        .where({class: {eq: "container3"}})
        .selectChildren("spans")
            .where({tagName: {eq: "SPAN"}})
            .limit(1)
            .skip(2)
            .order("desc");
        const result = await ayakashiInstance.extract("spans", "text");
        expect(result).toEqual([{
            spans: "hello"
        }]);
        await ayakashiInstance.__connection.release();
    });

    test("select second in parent with chaining", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        ayakashiInstance
        .select()
        .where({class: {eq: "container3"}})
        .selectFirstChild("spans")
            .where({tagName: {eq: "SPAN"}})
            .skip(1);
        const result = await ayakashiInstance.extract("spans", "text");
        expect(result).toEqual([{
            spans: "hello2"
        }]);
        await ayakashiInstance.__connection.release();
    });

    test("select second in parent with chaining and order desc", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        ayakashiInstance
        .select()
        .where({class: {eq: "container3"}})
        .selectChildren("spans")
            .where({tagName: {eq: "SPAN"}})
            .limit(1)
            .skip(1)
            .order("desc");
        const result = await ayakashiInstance.extract("spans", "text");
        expect(result).toEqual([{
            spans: "hello2"
        }]);
        await ayakashiInstance.__connection.release();
    });

    test("select last in parent with chaining", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        ayakashiInstance
        .select()
        .where({class: {eq: "container3"}})
        .selectLastChild("spans")
            .where({tagName: {eq: "SPAN"}});
        const result = await ayakashiInstance.extract("spans", "text");
        expect(result).toEqual([{
            spans: "hello3"
        }]);
        await ayakashiInstance.__connection.release();
    });

    test("select last in parent with chaining and order desc", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        ayakashiInstance
        .select()
        .where({class: {eq: "container3"}})
        .selectChildren("spans")
            .where({tagName: {eq: "SPAN"}})
            .limit(1)
            .order("desc");
        const result = await ayakashiInstance.extract("spans", "text");
        expect(result).toEqual([{
            spans: "hello3"
        }]);
        await ayakashiInstance.__connection.release();
    });

    test("select first in parent with double-chaining", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        ayakashiInstance
        .select()
        .where({class: {eq: "container4"}})
        .selectChildren()
            .where({class: {eq: "wrapper"}})
            .selectFirstChild("labels")
                .where({tagName: {eq: "LABEL"}});
        const result = await ayakashiInstance.extract("labels", "text");
        expect(result).toEqual([{
            labels: "a label"
        }]);
        await ayakashiInstance.__connection.release();
    });

    test("should throw if an uknown prop is used as parent", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        expect(function() {
            ayakashiInstance.selectFirst("spans").where({tagName: {eq: "SPAN"}}).from("uknownContainer");
        }).toThrowError("Uknown parent prop : uknownContainer");
        await ayakashiInstance.__connection.release();
    });

    test("using load twice should not reset the propTable", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("links").where({tagName: {eq: "A"}});
        const result = await ayakashiInstance.extract("links", "id");
        expect(result).toEqual([{
            links: "link1"
        }, {
            links: "link2"
        }]);
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        const result2 = await ayakashiInstance.extract("links", "id");
        expect(result2).toEqual([{
            links: "link1"
        }, {
            links: "link2"
        }]);
        await ayakashiInstance.__connection.release();
    });

    test("loading a different page should load a different DOM", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        //first load
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        ayakashiInstance.select("links").where({tagName: {eq: "A"}});
        const result = await ayakashiInstance.extract("links", "id");
        expect(result).toEqual([{
            links: "link1"
        }, {
            links: "link2"
        }]);
        const dom1 = ayakashiInstance.page;
        //second load
        const anotherPort = await getRandomPort();
        const anotherStaticServer = createStaticServer(anotherPort, `
            <html>
                <head>
                    <title>a different page</title>
                </head>
                <body>
                    <div class="container">
                        <a href="http://example.com" id="link3" class="links">Link1</a>
                    </div>
                    <div class="container2">
                        <a href="http://example.com" id="link4" class="links">Link2</a>
                    </div>
                </body>
            </html>
        `);
        await ayakashiInstance.load(`http://localhost:${anotherPort}`);
        const dom2 = ayakashiInstance.page;
        expect(dom1 === dom2).toBeFalse();
        const title = await ayakashiInstance.evaluate(function() {
            return this.document.title;
        });
        expect(title).toBe("a different page");
        ayakashiInstance.select("links").where({tagName: {eq: "A"}});
        const result2 = await ayakashiInstance.extract("links", "id");
        expect(result2).toEqual([{
            links: "link3"
        }, {
            links: "link4"
        }]);
        await ayakashiInstance.__connection.release();
        await new Promise(function(resolve) {
            anotherStaticServer.close(function() {
                resolve();
            });
        });
    });
});
