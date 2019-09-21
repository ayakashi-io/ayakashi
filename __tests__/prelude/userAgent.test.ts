//tslint:disable
import "jest-extended";
//tslint:enable
import http from "http";
import {getInstance, IHeadlessChrome} from "../../src/engine/browser";
import {getChromePath} from "../../src/store/chromium";
import {createStaticServer} from "../utils/startServer";
import {getRandomPort} from "../utils/getRandomPort";
import {getAyakashiInstance} from "../utils/getAyakashiInstance";
import {generate} from "../../src/utils/userAgent";

let staticServerPort: number;
let staticServer: http.Server;

let headlessChrome: IHeadlessChrome;
let bridgePort: number;
let protocolPort: number;

jest.setTimeout(600000);

describe("userAgent tests", function() {
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

    test("the default platform and userAgent are used", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        const userAgentData = generate(undefined, undefined);
        await ayakashiInstance.__connection.client.Emulation.setUserAgentOverride({
            userAgent: userAgentData.userAgent,
            platform: userAgentData.platform,
            acceptLanguage: "en-US"
        });
        const result = await ayakashiInstance.evaluate(function() {
            return {
                userAgent: navigator.userAgent,
                platform: navigator.platform
            };
        });
        expect(result.platform).toEqual(userAgentData.platform);
        expect(result.platform).toEqual("Win32");
        expect(result.userAgent).toEqual(userAgentData.userAgent);
        expect(result.userAgent).toMatch(/Chrome/);
        await ayakashiInstance.__connection.release();
    });

    test("mobile defaults", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        const userAgentData = generate("mobile", undefined);
        await ayakashiInstance.__connection.client.Emulation.setUserAgentOverride({
            userAgent: userAgentData.userAgent,
            platform: userAgentData.platform,
            acceptLanguage: "en-US"
        });
        const result = await ayakashiInstance.evaluate(function() {
            return {
                userAgent: navigator.userAgent,
                platform: navigator.platform
            };
        });
        expect(result.platform).toEqual(userAgentData.platform);
        expect(result.platform).toEqual("Linux armv8l");
        expect(result.userAgent).toEqual(userAgentData.userAgent);
        await ayakashiInstance.__connection.release();
    });

    test("chrome-desktop and custom platform", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        const userAgentData = generate("chrome-desktop", "MacIntel");
        await ayakashiInstance.__connection.client.Emulation.setUserAgentOverride({
            userAgent: userAgentData.userAgent,
            platform: userAgentData.platform,
            acceptLanguage: "en-US"
        });
        const result = await ayakashiInstance.evaluate(function() {
            return {
                userAgent: navigator.userAgent,
                platform: navigator.platform
            };
        });
        expect(result.platform).toEqual(userAgentData.platform);
        expect(result.platform).toEqual("MacIntel");
        expect(result.userAgent).toEqual(userAgentData.userAgent);
        expect(result.userAgent).toMatch(/Chrome/);
        await ayakashiInstance.__connection.release();
    });

    test("invalid platform-userAgent combination", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        const userAgentData = generate("chrome-desktop", "iPhone");
        await ayakashiInstance.__connection.client.Emulation.setUserAgentOverride({
            userAgent: userAgentData.userAgent,
            platform: userAgentData.platform,
            acceptLanguage: "en-US"
        });
        const result = await ayakashiInstance.evaluate(function() {
            return {
                userAgent: navigator.userAgent,
                platform: navigator.platform
            };
        });
        expect(result.platform).toEqual(userAgentData.platform);
        expect(result.platform).toEqual("Win32");
        expect(result.userAgent).toEqual(userAgentData.userAgent);
        expect(result.userAgent).toMatch(/Chrome/);
        await ayakashiInstance.__connection.release();
    });

    test("browser language", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        const userAgentData = generate("chrome-desktop", "MacIntel");
        await ayakashiInstance.__connection.client.Emulation.setUserAgentOverride({
            userAgent: userAgentData.userAgent,
            platform: userAgentData.platform,
            acceptLanguage: "en-US"
        });
        const result = await ayakashiInstance.evaluate(function() {
            return {
                acceptLanguage: navigator.language
            };
        });
        expect(result.acceptLanguage).toEqual("en-US");
        await ayakashiInstance.__connection.release();
    });
});
