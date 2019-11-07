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

describe("evaluate expressions", function() {
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

    test("can evaluate async expressions", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        const result = await ayakashiInstance.evaluateAsync<number>(function(num) {
            return new Promise(function(resolve) {
                setTimeout(function() {
                    resolve(num);
                }, 20);
            });
        }, 1);
        expect(result).toBe(1);
        await ayakashiInstance.__connection.release();
    });

    test("can pass arguments to evaluate", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        const result = await ayakashiInstance.evaluate<number>(function(num) {
            return num;
        }, 1);
        expect(result).toBe(1);
        await ayakashiInstance.__connection.release();
    });

    test("can pass objects to evaluate", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        const result = await ayakashiInstance.evaluate<number>(function(param) {
            return param.num;
        }, {num: 1});
        expect(result).toBe(1);
        await ayakashiInstance.__connection.release();
    });

    test("can pass functions to evaluate", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        const result = await ayakashiInstance.evaluate<number>(function(fn) {
            return fn();
        }, function() { return 1; });
        expect(result).toBe(1);
        await ayakashiInstance.__connection.release();
    });

    test("can pass arrow functions to evaluate", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        const result = await ayakashiInstance.evaluate<number>(function(fn) {
            return fn();
        }, () => 1);
        expect(result).toBe(1);
        await ayakashiInstance.__connection.release();
    });

    test("can pass nested functions to evaluate", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        const result = await ayakashiInstance.evaluate<number>(function(param) {
            return param.myFn();
        }, {myFn: function() { return 1; }});
        expect(result).toBe(1);
        await ayakashiInstance.__connection.release();
    });

    test("can pass nested arrow functions to evaluate", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        const result = await ayakashiInstance.evaluate<number>(function(param) {
            return param.myFn();
        }, {myFn: () => 1});
        expect(result).toBe(1);
        await ayakashiInstance.__connection.release();
    });

    test("can pass regexes to evaluate", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        const result = await ayakashiInstance.evaluate<boolean>(function(param) {
            return param.test("hello there");
        }, /hello/);
        expect(result).toBe(true);
        await ayakashiInstance.__connection.release();
    });

    test("can pass nested regexes to evaluate", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        const result = await ayakashiInstance.evaluate<boolean>(function(param) {
            return param.myRegex.test("hello there");
        }, {myRegex: /hello/});
        expect(result).toBe(true);
        await ayakashiInstance.__connection.release();
    });

    test("throws an error if evaluate throws an error", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        await expect((async function() {
            await ayakashiInstance.evaluate(function() {
                throw new Error("test error!");
            });
        })()).rejects.toThrow();
        await ayakashiInstance.__connection.release();
    });

    test("throws an error if evaluateAsync returns a rejected promise", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        await expect((async function() {
            await ayakashiInstance.evaluateAsync(function() {
                return new Promise(function(_, reject) {
                    setTimeout(function() {
                        reject(new Error("test error!"));
                    }, 20);
                });
            });
        })()).rejects.toThrow();
        await ayakashiInstance.__connection.release();
    });
});
