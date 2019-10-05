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

describe("clicking tests", function() {
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
                    <button id="myButton">click me</button>
                    <script>
                        const myButton = document.getElementById("myButton");
                        window.counter = 0;
                        myButton.addEventListener("click", function () {
                            counter += 1;
                        });
                        myButton.addEventListener("dblclick", function () {
                            counter += 1;
                        });
                        myButton.addEventListener("contextmenu", function (e) {
                            counter += 10;
                            e.preventDefault();
                            return false;
                        });
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

    test("single left click", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myButton").where({id: {eq: "myButton"}});
        await ayakashiInstance.click("myButton");
        const result = await ayakashiInstance.evaluate<number>(function() {
            //@ts-ignore
            return window.counter;
        });
        expect(result).toBe(1);
        await ayakashiInstance.__connection.release();
    });

    test("doubleClick", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myButton").where({id: {eq: "myButton"}});
        await ayakashiInstance.doubleClick("myButton");
        const result = await ayakashiInstance.evaluate<number>(function() {
            //@ts-ignore
            return window.counter;
        });
        expect(result).toBe(2);
        await ayakashiInstance.__connection.release();
    });

    test("rightClick", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myButton").where({id: {eq: "myButton"}});
        await ayakashiInstance.rightClick("myButton");
        const result = await ayakashiInstance.evaluate<number>(function() {
            //@ts-ignore
            return window.counter;
        });
        expect(result).toBe(10);
        await ayakashiInstance.__connection.release();
    });

});
