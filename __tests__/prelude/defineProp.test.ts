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

describe("defineProp tests", function() {
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
                    </div>
                    <div class="container">
                        <a href="http://example.com" class="links">link2</a>
                    </div>
                    <div class="container">
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

    test("use a simple prop", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.defineProp(function() {
            return this.document.querySelectorAll(".links");
        }, "myLinkProp");
        const result = await ayakashiInstance.extract("myLinkProp");
        expect(result).toEqual(["link1", "link2", "link3"]);
        await ayakashiInstance.__connection.release();
    });

    test("body prop should be already defined", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        expect(ayakashiInstance.prop("body")).not.toBeNull();
        await ayakashiInstance.__connection.release();
    });

    test("head prop should be already defined", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        expect(ayakashiInstance.prop("head")).not.toBeNull();
        await ayakashiInstance.__connection.release();
    });
});
