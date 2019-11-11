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

describe("waiting tests", function() {
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
                    <input type="text" id="myHiddenInput" style="display:none;"></input>
                    <input type="text" id="foreverHiddenInput" style="display:none;"></input>
                    <script>
                        const theNewDiv = document.createElement("div");
                        theNewDiv.id = "theNewDiv";
                        setTimeout(function() {
                            document.body.appendChild(theNewDiv);
                            document.getElementById("myHiddenInput").style.display = "block";
                        }, 1000);
                    </script>
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

    test("wait for an element to exist", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("theNewDiv").where({id: {eq: "theNewDiv"}});
        expect((async function() {
            await ayakashiInstance.waitUntilExists("theNewDiv");
        })()).toResolve();
        await ayakashiInstance.__connection.release();
    });

    test("wait for an element to become visible", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myHiddenInput").where({id: {eq: "myHiddenInput"}});
        expect((async function() {
            await ayakashiInstance.waitUntilVisible("myHiddenInput");
        })()).toResolve();
        await ayakashiInstance.__connection.release();
    });

    test("should throw an error if the timeout period passes and element still does not exist", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("foreverUnknown").where({id: {eq: "foreverUnknown"}});
        expect((async function() {
            await ayakashiInstance.waitUntilExists("foreverUnknown", 1000);
        })()).rejects.toThrowError("<waitUntil> timed out after waiting 1000ms");
        await ayakashiInstance.__connection.release();
    });

    test("should throw an error if the timeout period passes and element is still hidden", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("foreverHiddenInput").where({id: {eq: "foreverHiddenInput"}});
        expect((async function() {
            await ayakashiInstance.waitUntilVisible("foreverHiddenInput", 1000);
        })()).rejects.toThrowError("<waitUntil> timed out after waiting 1000ms");
        await ayakashiInstance.__connection.release();
    });

});
