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

describe("join() tests", function() {
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
                        <label>The link 1</label>
                        <a href="http://example.com" class="links">link1</a>
                    </div>
                    <div class="container">
                        <a href="http://example.com" class="links">link2</a>
                    </div>
                    <div class="container">
                        <label>The link 3</label>
                        <a href="http://example.com" class="links">link3</a>
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

    test("simple join", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance
            .select("myLinkProp")
            .where({
                class: {
                    eq: "links"
                }
            });
        const result = await ayakashiInstance.extract("myLinkProp");
        expect(result).toEqual(["link1", "link2", "link3"]);
        const joined = ayakashiInstance.join({
            text: result
        });
        expect(joined).toEqual([{
            text: "link1"
        }, {
            text: "link2"
        }, {
            text: "link3"
        }]);
        await ayakashiInstance.__connection.release();
    });

    test("join with a non-array value", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance
            .select("myLinkProp")
            .where({
                class: {
                    eq: "links"
                }
            });
        const result = await ayakashiInstance.extract("myLinkProp");
        expect(result).toEqual(["link1", "link2", "link3"]);
        const joined = ayakashiInstance.join({
            text: result,
            constant: 5
        });
        expect(joined).toEqual([{
            text: "link1",
            constant: 5
        }, {
            text: "link2",
            constant: 5
        }, {
            text: "link3",
            constant: 5
        }]);
        await ayakashiInstance.__connection.release();
    });

    test("join multiple props", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance
            .select("container")
            .where({
                class: {
                    eq: "container"
                }
            })
            .trackMissingChildren();
        ayakashiInstance
            .select("myLinkProp")
            .where({
                class: {
                    eq: "links"
                }
            })
            .from("container");
        ayakashiInstance
            .select("myLabelProp")
            .where({
                tagName: {
                    eq: "label"
                }
            })
            .from("container");
        const links = await ayakashiInstance.extract("myLinkProp");
        const labels = await ayakashiInstance.extract("myLabelProp");
        expect(links).toEqual(["link1", "link2", "link3"]);
        expect(labels).toEqual(["The link 1", "", "The link 3"]);
        expect(ayakashiInstance.join({
            name: links,
            label: labels
        })).toEqual([{
            name: "link1",
            label: "The link 1"
        }, {
            name: "link2",
            label: ""
        }, {
            name: "link3",
            label: "The link 3"
        }]);
        await ayakashiInstance.__connection.release();
    });

    test("join multiple props and a non-array value", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance
            .select("container")
            .where({
                class: {
                    eq: "container"
                }
            })
            .trackMissingChildren();
        ayakashiInstance
            .select("myLinkProp")
            .where({
                class: {
                    eq: "links"
                }
            })
            .from("container");
        ayakashiInstance
            .select("myLabelProp")
            .where({
                tagName: {
                    eq: "label"
                }
            })
            .from("container");
        const links = await ayakashiInstance.extract("myLinkProp");
        const labels = await ayakashiInstance.extract("myLabelProp");
        expect(links).toEqual(["link1", "link2", "link3"]);
        expect(labels).toEqual(["The link 1", "", "The link 3"]);
        expect(ayakashiInstance.join({
            name: links,
            label: labels,
            constant: "hello"
        })).toEqual([{
            name: "link1",
            label: "The link 1",
            constant: "hello"
        }, {
            name: "link2",
            label: "",
            constant: "hello"
        }, {
            name: "link3",
            label: "The link 3",
            constant: "hello"
        }]);
        await ayakashiInstance.__connection.release();
    });

    test("throw an error if a value doesn't match the length of the other values", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance
            .select("container")
            .where({
                class: {
                    eq: "container"
                }
            });
        ayakashiInstance
            .select("myLinkProp")
            .where({
                class: {
                    eq: "links"
                }
            })
            .from("container");
        ayakashiInstance
            .select("myLabelProp")
            .where({
                tagName: {
                    eq: "label"
                }
            })
            .from("container");
        const links = await ayakashiInstance.extract("myLinkProp");
        const labels = await ayakashiInstance.extract("myLabelProp");
        expect(links).toEqual(["link1", "link2", "link3"]);
        expect(labels).toEqual(["The link 1", "The link 3"]);
        expect(function() {
            ayakashiInstance.join({
                name: links,
                label: labels
            });
        }).toThrowError("Property <label> does not have the correct length");
        await ayakashiInstance.__connection.release();
    });

    test("throw an error if an invalid value is passed", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        expect(function() {
            //@ts-ignore
            ayakashiInstance.join("some value");
        }).toThrowError("Invalid object");
        expect(function() {
            //@ts-ignore
            ayakashiInstance.join();
        }).toThrowError("Invalid object");
        expect(function() {
            //@ts-ignore
            ayakashiInstance.join({});
        }).toThrowError("Invalid object");
        expect(function() {
            //@ts-ignore
            ayakashiInstance.join([]);
        }).toThrowError("Invalid object");
        expect(function() {
            //@ts-ignore
            ayakashiInstance.join(null);
        }).toThrowError("Invalid object");
        await ayakashiInstance.__connection.release();
    });

    test("join only non-array values", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance
            .select("container")
            .where({
                class: {
                    eq: "container"
                }
            })
            .trackMissingChildren();
        ayakashiInstance
            .select("myLinkProp")
            .where({
                class: {
                    eq: "links"
                }
            })
            .from("container");
        ayakashiInstance
            .select("myLabelProp")
            .where({
                tagName: {
                    eq: "label"
                }
            })
            .from("container");
        const links = await ayakashiInstance.extractFirst("myLinkProp");
        const labels = await ayakashiInstance.extractFirst("myLabelProp");
        expect(links).toEqual("link1");
        expect(labels).toEqual("The link 1");
        expect(ayakashiInstance.join({
            name: links,
            label: labels,
            constant: "hello"
        })).toEqual([{
            name: "link1",
            label: "The link 1",
            constant: "hello"
        }]);
        await ayakashiInstance.__connection.release();
    });
});
