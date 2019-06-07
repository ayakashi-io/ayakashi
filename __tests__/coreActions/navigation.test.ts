//tslint:disable
import "jest-extended";
//tslint:enable
import http from "http";
import {getInstance, IHeadlessChrome} from "../../src/engine/browser";
import {getChromePath} from "../../src/store/chromium";
import {createStaticServer} from "../utils/startServer";
import {getRandomPort} from "../utils/getRandomPort";
import {getAyakashiInstance} from "../utils/getAyakashiInstance";

let staticServerPort: number;
let anotherStaticServerPort: number;
let staticServer: http.Server;
let anotherStaticServer: http.Server;

let headlessChrome: IHeadlessChrome;
let bridgePort: number;
let protocolPort: number;

jest.setTimeout(600000);

describe("navigation tests", function() {
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
                <body></body>
            </html>
            `
        );
        anotherStaticServerPort = await getRandomPort();
        //tslint:disable max-line-length
        anotherStaticServer = createStaticServer(anotherStaticServerPort,
            `
            <html>
                <head>
                    <title>test page 2</title>
                </head>
                <body>
                    <a id="myLink" href="http://localhost:${staticServerPort}">Go to to the first test page</a>
                    <a id="myLinkWithBlank" target="_blank" href="http://localhost:${staticServerPort}">Go to to the first test page</a>
                </body>
            </html>
            `
        );
        //tslint:enable max-line-length
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
            anotherStaticServer.close(function() {
                done();
            });
        });
    });

    test("click to navigate to a new page", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${anotherStaticServerPort}`);
        ayakashiInstance.selectOne("myLink").where({id: {eq: "myLink"}});
        await ayakashiInstance.navigationClick("myLink");
        const result = await ayakashiInstance.evaluate<string>(function() {
            return document.title;
        });
        expect(result).toBe("test page");
        await ayakashiInstance.__connection.release();
    });

    test("click a link with target=_blank to navigate to a new page", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${anotherStaticServerPort}`);
        ayakashiInstance.selectOne("myLink").where({id: {eq: "myLinkWithBlank"}});
        await ayakashiInstance.navigationClick("myLink");
        const result = await ayakashiInstance.evaluate<string>(function() {
            return document.title;
        });
        expect(result).toBe("test page");
        await ayakashiInstance.__connection.release();
    });

});