//tslint:disable
import "jest-extended";
//tslint:enable
import http from "http";
import {mkdtempSync} from "fs";
import {tmpdir} from "os";
import {join, resolve as pathResolve} from "path";

import {getInstance, IHeadlessChrome} from "../../src/engine/browser";
import {createConnection} from "../../src/engine/createConnection";
import {getChromePath} from "../../src/chromeDownloader/downloader";

import {createStaticServer} from "../utils/startServer";
import {getRandomPort} from "../utils/getRandomPort";

let staticServerPort: number;
let staticServer: http.Server;

let headlessChrome: IHeadlessChrome;

jest.setTimeout(600000);

describe("launcher tests", function() {
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

    afterEach(async function() {
        await headlessChrome.close();
    });

    test("it can launch", async function() {
        headlessChrome = getInstance();
        await headlessChrome.init({
            chromePath: chromePath,
            bridgePort: await getRandomPort(),
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

    test("it should ignore certificate errors if ignoreCertificateErrors is set", async function() {
        headlessChrome = getInstance();
        const bridgePort = await getRandomPort();
        await headlessChrome.init({
            chromePath: chromePath,
            ignoreCertificateErrors: true,
            bridgePort: bridgePort,
            protocolPort: await getRandomPort()
        });
        const target = await headlessChrome.createTarget();
        if (!target) throw new Error("no_target");
        const connection = await createConnection(target.tab, bridgePort);
        await connection.activate();
        await connection.client.Page.navigate({url: "https://expired.badssl.com/"});
        await connection.client.Page.loadEventFired();
        const result = await connection.evaluate<string>(function() {
            return document.title;
        });
        expect(result).toBe("expired.badssl.com");
        await connection.release();
    });

    test("it should use a custom user-agent if it is passed", async function() {
        headlessChrome = getInstance();
        const bridgePort = await getRandomPort();
        await headlessChrome.init({
            chromePath: chromePath,
            userAgent: "test-agent",
            bridgePort: bridgePort,
            protocolPort: await getRandomPort()
        });
        const target = await headlessChrome.createTarget();
        if (!target) throw new Error("no_target");
        const connection = await createConnection(target.tab, bridgePort);
        await connection.activate();
        await connection.client.Page.navigate({url: `http://localhost:${staticServerPort}`});
        await connection.client.Page.loadEventFired();
        const result = await connection.evaluate<string>(function() {
            return navigator.userAgent;
        });
        expect(result).toBe("test-agent");
        await connection.release();
    });

    test("it can use persistent sessions", async function() {
        headlessChrome = getInstance();
        const bridgePort = await getRandomPort();
        const sessionDir = mkdtempSync(join(tmpdir(), "ayakashi-test-session."));
        await headlessChrome.init({
            chromePath: chromePath,
            sessionDir: sessionDir,
            bridgePort: bridgePort,
            protocolPort: await getRandomPort()
        });
        const target = await headlessChrome.createTarget();
        if (!target) throw new Error("no_target");
        const connection = await createConnection(target.tab, bridgePort);
        if (!connection) throw new Error("jest_connection_not_created");
        await connection.activate();
        await connection.client.Page.navigate({url: `http://localhost:${staticServerPort}`});
        await connection.client.Page.loadEventFired();
        await connection.evaluate(function() {
            localStorage.setItem("hello", "hello");
        });
        await connection.release();
        await headlessChrome.close();
        headlessChrome = getInstance();
        await headlessChrome.init({
            chromePath: chromePath,
            sessionDir: sessionDir,
            bridgePort: bridgePort,
            protocolPort: await getRandomPort()
        });
        const target2 = await headlessChrome.createTarget();
        if (!target2) throw new Error("no_target");
        const connection2 = await createConnection(target2.tab, bridgePort);
        if (!connection2) throw new Error("jest_connection_not_created");
        await connection2.activate();
        await connection2.client.Page.navigate({url: `http://localhost:${staticServerPort}`});
        await connection2.client.Page.loadEventFired();
        const result = await connection2.evaluate<string>(function() {
            return localStorage.getItem("hello");
        });
        await connection2.release();
        expect(result).toBe("hello");
    });
});
