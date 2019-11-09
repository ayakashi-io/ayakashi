//tslint:disable
import "jest-extended";
//tslint:enable
import http from "http";
import {mkdtempSync} from "fs";
import {tmpdir} from "os";
import {join} from "path";

import {getInstance, IHeadlessChrome} from "../../src/engine/browser";
import {createConnection} from "../../src/engine/createConnection";
import {getChromePath} from "../../src/store/chromium";
import {startBridge} from "../../src/bridge/bridge";
import {addConnectionRoutes} from "../../src/bridge/connection";
import {Express} from "express";

import {createStaticServer} from "../utils/startServer";
import {getRandomPort} from "../../src/utils/getRandomPort";

let staticServerPort: number;
let staticServer: http.Server;

let headlessChrome: IHeadlessChrome;
let closeBridge: () => Promise<void>;
let bridge: Express;
let bridgePort: number;

jest.setTimeout(600000);

describe("launcher tests", function() {
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
                </body>
            </html>
            `
        );
    });

    beforeEach(async function() {
        bridgePort = await getRandomPort();
        const b = await startBridge(bridgePort);
        bridge = b.bridge;
        closeBridge = b.closeBridge;
    });

    afterAll(function(done) {
        staticServer.close(function() {
            done();
        });
    });

    afterEach(async function() {
        await headlessChrome.close();
        await closeBridge();
    });

    test("it can launch", async function() {
        headlessChrome = getInstance();
        await headlessChrome.init({
            chromePath: chromePath,
            protocolPort: await getRandomPort()
        });
    });

    test("it should throw if options object is not passed", async function() {
        headlessChrome = getInstance();
        expect((async function() {
            //@ts-ignore
            await headlessChrome.init();
        })()).rejects.toThrowError("init_options_not_set");
    });

    test("it should throw if chromePath is not passed", async function() {
        headlessChrome = getInstance();
        expect((async function() {
            //@ts-ignore
            await headlessChrome.init({});
        })()).rejects.toThrowError("chrome_path_not_set");
    });
});
