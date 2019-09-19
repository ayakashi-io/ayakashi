//tslint:disable
import "jest-extended";
//tslint:enable
import http from "http";
import {getInstance, IHeadlessChrome} from "../../src/engine/browser";
import {createConnection} from "../../src/engine/createConnection";
import {getChromePath} from "../../src/store/chromium";
import {createStaticServer} from "../utils/startServer";
import {getRandomPort} from "../utils/getRandomPort";

let staticServerPort: number;
let staticServer: http.Server;

let headlessChrome: IHeadlessChrome;
let bridgePort: number;
let protocolPort: number;

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

    test("it can create targets and connections", async function() {
        const target = await headlessChrome.createTarget();
        if (!target) throw new Error("no_target");
        const connection = await createConnection(target, bridgePort);
        expect(connection).not.toBeNull();
    });

    test("it can load a page", async function() {
        const target = await headlessChrome.createTarget();
        if (!target) throw new Error("no_target");
        const connection = await createConnection(target, bridgePort);
        if (!connection) throw new Error("jest_connection_not_created");
        await connection.activate();
        await connection.client.Page.navigate({url: `http://localhost:${staticServerPort}`});
        await connection.client.Page.loadEventFired();
        const result = await connection.evaluate<string>(function() {
            return document.title;
        });
        expect(result).toBe("test page");
        await connection.release();
    });

    test("it can pass arguments to evaluate", async function() {
        const target = await headlessChrome.createTarget();
        if (!target) throw new Error("no_target");
        const connection = await createConnection(target, bridgePort);
        if (!connection) throw new Error("jest_connection_not_created");
        await connection.activate();
        await connection.client.Page.navigate({url: `http://localhost:${staticServerPort}`});
        await connection.client.Page.loadEventFired();
        const result = await connection.evaluate<number>(function(num) {
            return num;
        }, 1);
        expect(result).toBe(1);
        await connection.release();
    });

    test("it can evaluate async expressions", async function() {
        const target = await headlessChrome.createTarget();
        if (!target) throw new Error("no_target");
        const connection = await createConnection(target, bridgePort);
        if (!connection) throw new Error("jest_connection_not_created");
        await connection.activate();
        await connection.client.Page.navigate({url: `http://localhost:${staticServerPort}`});
        await connection.client.Page.loadEventFired();
        const result = await connection.evaluateAsync<number>(function(num) {
            return new Promise(function(resolve) {
                setTimeout(function() {
                    resolve(num);
                }, 20);
            });
        }, 1);
        expect(result).toBe(1);
        await connection.release();
    });

    test("it should throw an error if evaluate throws an error", async function() {
        const target = await headlessChrome.createTarget();
        if (!target) throw new Error("no_target");
        const connection = await createConnection(target, bridgePort);
        if (!connection) throw new Error("jest_connection_not_created");
        await connection.activate();
        await connection.client.Page.navigate({url: `http://localhost:${staticServerPort}`});
        await connection.client.Page.loadEventFired();
        await expect((async function() {
            await connection.evaluate(function() {
                throw new Error("test error!");
            });
        })()).rejects.toThrow();
        await connection.release();
    });

    test("it should throw an error if evaluateAsync returns a rejected promise", async function() {
        const target = await headlessChrome.createTarget();
        if (!target) throw new Error("no_target");
        const connection = await createConnection(target, bridgePort);
        if (!connection) throw new Error("jest_connection_not_created");
        await connection.activate();
        await connection.client.Page.navigate({url: `http://localhost:${staticServerPort}`});
        await connection.client.Page.loadEventFired();
        await expect((async function() {
            await connection.evaluateAsync(function() {
                return new Promise(function(_, reject) {
                    setTimeout(function() {
                        reject(new Error("test error!"));
                    }, 20);
                });
            });
        })()).rejects.toThrow();
        await connection.release();
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
            await connection.evaluate<string>(function() {
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

    test("it can inject preloaders", async function() {
        const target = await headlessChrome.createTarget();
        if (!target) throw new Error("no_target");
        const connection = await createConnection(target, bridgePort);
        if (!connection) throw new Error("jest_connection_not_created");
        await connection.injectPreloader({
            compiled: {
                wrapper: "ayakashi__test",
                source: "window.myVar = 1;"
            },
            as: null,
            waitForDOM: false
        });
        await connection.activate();
        await connection.client.Page.navigate({url: `http://localhost:${staticServerPort}`});
        await connection.client.Page.loadEventFired();
        const result = await connection.evaluate<number>(function() {
            //@ts-ignore
            return window.myVar += 1;
        });
        expect(result).toBe(2);
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

    test("it can pipe console.log", async function() {
        const target = await headlessChrome.createTarget();
        if (!target) throw new Error("no_target");
        const connection = await createConnection(target, bridgePort);
        if (!connection) throw new Error("jest_connection_not_created");
        connection.pipe.console(function(text) {
            expect(text).toBe("hi there!");
        });
        await connection.activate();
        await connection.client.Page.navigate({url: `http://localhost:${staticServerPort}`});
        await connection.client.Page.loadEventFired();
        await connection.evaluate(function() {
            console.log("hi there!");
        });
        await connection.release();
    });

    test("it can pipe uncaughtException", async function() {
        const target = await headlessChrome.createTarget();
        if (!target) throw new Error("no_target");
        const connection = await createConnection(target, bridgePort);
        if (!connection) throw new Error("jest_connection_not_created");
        connection.pipe.uncaughtException(function(exception) {
            expect(exception.text).toMatch("my test error");
        });
        await connection.injectPreloader({
            compiled: {
                wrapper: "ayakashi__test",
                source: "throw new Error('my test error');"
            },
            as: null,
            waitForDOM: false
        });
        await connection.activate();
        await connection.client.Page.navigate({url: `http://localhost:${staticServerPort}`});
        await connection.client.Page.loadEventFired();
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

    test("it should ignore certificate errors if ignoreCertificateErrors is set", async function() {
        const target = await headlessChrome.createTarget();
        if (!target) throw new Error("no_target");
        const connection = await createConnection(target, bridgePort);
        if (!connection) throw new Error("jest_connection_not_created");
        await connection.activate();
        await connection.client.Page.navigate({url: "https://expired.badssl.com/"});
        await connection.client.Page.loadEventFired();
        const result = await connection.evaluate<string>(function() {
            return document.title;
        });
        expect(result).toBe("");
        //set the flag
        await connection.client.Security.setIgnoreCertificateErrors({ignore: true});
        await connection.client.Page.navigate({url: "https://expired.badssl.com/"});
        await connection.client.Page.loadEventFired();
        const result2 = await connection.evaluate<string>(function() {
            return document.title;
        });
        expect(result2).toBe("expired.badssl.com");
        await connection.release();
    });
});
