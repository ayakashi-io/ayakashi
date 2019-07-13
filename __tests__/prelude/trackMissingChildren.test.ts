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
let staticServer: http.Server;

let headlessChrome: IHeadlessChrome;
let bridgePort: number;
let protocolPort: number;

jest.setTimeout(600000);

describe("select tests", function() {
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

    test("trackMissingChildren ON", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance
            .select("parentProp")
            .where({class: {eq: "container"}})
            .trackMissingChildren()
            .selectChild("childProp")
            .where({tagName: {eq: "A"}});
        const result = await ayakashiInstance.extract("childProp");
        expect(result).toEqual([{
            childProp: "link1"
        }, {
            childProp: "link2"
        }, {
            childProp: ""
        }, {
            childProp: "link3"
        }]);
        await ayakashiInstance.__connection.release();
    });

    test("trackMissingChildren OFF", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance
            .select("parentProp")
            .where({class: {eq: "container"}})
            .selectChild("childProp")
            .where({tagName: {eq: "A"}});
        const result = await ayakashiInstance.extract("childProp");
        expect(result).toEqual([{
            childProp: "link1"
        }, {
            childProp: "link2"
        }, {
            childProp: "link3"
        }]);
        await ayakashiInstance.__connection.release();
    });
});
