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
                        <a href="http://example.com" class="links">link1</a>
                        <div class="inner">
                            <div class="inner2">
                                <span data-value="1"></span>
                            </div>
                        </div>
                    </div>
                    <div class="container">
                        <a href="http://example.com" class="links">link2</a>
                    </div>
                    <div class="container">
                    </div>
                    <div class="container">
                        <a href="http://example.com" class="links">link3</a>
                        <div class="inner">
                            <div class="inner2">
                                <span data-value="1"></span>
                            </div>
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

    test("trackMissingChildren ON", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance
            .select("parentProp")
            .where({class: {eq: "container"}})
            .trackMissingChildren()
            .selectChild("childProp")
            .where({tagName: {eq: "A"}});
        const result = await ayakashiInstance.extract("childProp");
        expect(result).toEqual(["link1", "link2", "", "link3"]);
        await ayakashiInstance.__connection.release();
    });

    test("trackMissingChildren OFF", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance
            .select("parentProp")
            .where({class: {eq: "container"}})
            .selectChild("childProp")
            .where({tagName: {eq: "A"}});
        const result = await ayakashiInstance.extract("childProp");
        expect(result).toEqual(["link1", "link2", "link3"]);
        await ayakashiInstance.__connection.release();
    });

    test("trackMissingChildren cascades on child props", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance
            .select("parentProp")
            .where({class: {eq: "container"}})
            .trackMissingChildren()
                .selectChild("inner")
                .where({class: {eq: "inner"}})
                    .selectChild("inner2")
                    .where({class: {eq: "inner2"}})
                        .selectChild("childProp")
                        .where({tagName: {eq: "span"}});
        const result = await ayakashiInstance.extract("childProp", "data-value");
        expect(result).toEqual(["1", "", "", "1"]);
        await ayakashiInstance.__connection.release();
    });
});
