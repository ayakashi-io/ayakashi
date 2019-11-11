//tslint:disable
import "jest-extended";
//tslint:enable
import http from "http";
import {getInstance, IHeadlessChrome} from "../../src/engine/browser";
import {createConnection} from "../../src/engine/createConnection";
import {getChromePath} from "../../src/store/chromium";
import {createStaticServer} from "../utils/startServer";
import {getRandomPort} from "../../src/utils/getRandomPort";
import {startBridge} from "../../src/bridge/bridge";
import {addConnectionRoutes} from "../../src/bridge/connection";

let staticServerPort: number;
let staticServer: http.Server;

let headlessChrome: IHeadlessChrome;
let bridgePort: number;
let protocolPort: number;
let closeBridge: () => Promise<void>;

jest.setTimeout(600000);

describe("target/connection tests", function() {
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

    test("it can create targets and connections", async function() {
        const target = await headlessChrome.createTarget();
        if (!target) throw new Error("no_target");
        const connection = await createConnection(target, bridgePort);
        expect(connection).not.toBeNull();
    });

    test("it should throw if evaluate is used on an inactive connection", async function() {
        const target = await headlessChrome.createTarget();
        if (!target) throw new Error("no_target");
        const connection = await createConnection(target, bridgePort);
        if (!connection) throw new Error("jest_connection_not_created");
        await connection.activate();
        await connection.client.Page.navigate({url: `http://localhost:${staticServerPort}`});
        await connection.client.Page.loadEventFired();
        await connection.release();
        expect((async function() {
            await connection.evaluate(function() {
                return document.title;
            });
        })()).rejects.toThrowError("connection_not_active");
    });

    test("it should throw if an inactive connection is released", async function() {
        const target = await headlessChrome.createTarget();
        if (!target) throw new Error("no_target");
        const connection = await createConnection(target, bridgePort);
        if (!connection) throw new Error("jest_connection_not_created");
        expect((async function() {
            await connection.release();
        })()).rejects.toThrowError("connection_not_active");
    });

    test("it should throw if an already active connection is activated", async function() {
        const target = await headlessChrome.createTarget();
        if (!target) throw new Error("no_target");
        const connection = await createConnection(target, bridgePort);
        if (!connection) throw new Error("jest_connection_not_created");
        await connection.activate();
        expect((async function() {
            await connection.activate();
        })()).rejects.toThrowError("connection_already_active");
        await connection.release();
    });

    test("it should throw if a preloader is injected into an active connection", async function() {
        const target = await headlessChrome.createTarget();
        if (!target) throw new Error("no_target");
        const connection = await createConnection(target, bridgePort);
        if (!connection) throw new Error("jest_connection_not_created");
        await connection.activate();
        await connection.client.Page.navigate({url: `http://localhost:${staticServerPort}`});
        await connection.client.Page.loadEventFired();
        expect((async function() {
            await connection.injectPreloader({
                compiled: {
                    wrapper: "ayakashi__test",
                    source: "var myVar = 1;"
                },
                as: null,
                waitForDOM: false
            });
        })()).rejects.toThrowError("cannot_inject_preloader_into_active_connection");
        await connection.release();
    });

    test("it should throw an error if an event is piped into an active connection", async function() {
        const target = await headlessChrome.createTarget();
        if (!target) throw new Error("no_target");
        const connection = await createConnection(target, bridgePort);
        if (!connection) throw new Error("jest_connection_not_created");
        await connection.activate();
        expect((async function() {
            connection.pipe.console(function() {});
            await connection.client.Page.navigate({url: `http://localhost:${staticServerPort}`});
            await connection.client.Page.loadEventFired();
            await connection.evaluate(function() {
                console.log("hi there!");
            });
        })()).rejects.toThrowError("cannot_pipe_events_into_active_connection");
        await connection.release();
    });
});
