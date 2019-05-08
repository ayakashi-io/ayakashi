//tslint:disable
import "jest-extended";
//tslint:enable
import http from "http";
import {getInstance, IHeadlessChrome} from "../../src/engine/browser";
import {getChromePath} from "../../src/chromeDownloader/downloader";
import {createStaticServer} from "../utils/startServer";
import {resolve as pathResolve} from "path";
import {getRandomPort} from "../utils/getRandomPort";
import {getAyakashiInstance} from "../utils/getAyakashiInstance";

let staticServerPort: number;
let staticServer: http.Server;

let headlessChrome: IHeadlessChrome;
let bridgePort: number;
let protocolPort: number;

jest.setTimeout(600000);

describe("retry tests", function() {
    let chromePath: string;
    beforeAll(async function() {
        chromePath = getChromePath(pathResolve(".", "__tests__"));
        staticServerPort = await getRandomPort();
        staticServer = createStaticServer(staticServerPort,
            `
            <html>
                <head>
                    <title>test page</title>
                </head>
                <body>
                    <div id="myDiv" class="divs">hello</div>
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

    test("retry operation until max retries are reached", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        let theLastRetry = 0;
        console.error = function() {};
        try {
            await ayakashiInstance.retry(async function(currentRetry) {
                theLastRetry = currentRetry;
                await ayakashiInstance.goTo(`http://localhost:${staticServerPort}/slow`, 100);
            }, 2);
        } catch (_e) {}
        expect(theLastRetry).toBe(2);
        await ayakashiInstance.__connection.release();
    });

    test("stop retrying if we have a success", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        let theLastRetry = 0;
        console.error = function() {};
        await ayakashiInstance.retry(async function(currentRetry) {
            theLastRetry = currentRetry;
            if (currentRetry === 3) return true;
            return ayakashiInstance.goTo(`http://localhost:${staticServerPort}/slow`, 100);
        }, 5);
        expect(theLastRetry).toBe(3);
        await ayakashiInstance.__connection.release();
    });

    test("when max retries are reached it should finally throw the error", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        console.error = function() {};
        await expect((async function() {
            await ayakashiInstance.retry(async function(_currentRetry) {
                await ayakashiInstance.goTo(`http://localhost:${staticServerPort}/slow`, 100);
            }, 2);
        })()).rejects.toThrow();
        await ayakashiInstance.__connection.release();
    });

    test("retry should return the result of the operation", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        const result = await ayakashiInstance.retry(async function(_currentRetry) {
            return 1;
        }, 2);
        expect(result).toBe(1);
        await ayakashiInstance.__connection.release();
    });

    test("retry should throw an error if the operation is not an async function", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        console.error = function() {};
        expect((async function() {
            //@ts-ignore
            await ayakashiInstance.retry(function(_currentRetry) {
                return 1 + 1;
            }, 2);
        })()).rejects.toThrowError("<retry> requires an async function that returns a promise");
        await ayakashiInstance.__connection.release();
    });

    test("retry should throw an error if no operation function is passed", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        console.error = function() {};
        expect((async function() {
            //@ts-ignore
            await ayakashiInstance.retry();
        })()).rejects.toThrowError("<retry> requires a function to run");
        await ayakashiInstance.__connection.release();
    });
});
