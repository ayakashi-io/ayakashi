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

describe("typing tests", function() {
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
                    <input type="text" id="myInput"></input>
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

    test("type some text", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myInput").where({id: {eq: "myInput"}});
        await ayakashiInstance.typeIn("myInput", "hey there");
        const result = await ayakashiInstance.evaluate<string>(function() {
            //@ts-ignore
            return document.getElementById("myInput").value;
        });
        expect(result).toBe("hey there");
        await ayakashiInstance.__connection.release();
    });

    test("clear an input", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myInput").where({id: {eq: "myInput"}});
        await ayakashiInstance.typeIn("myInput", "hey there");
        await ayakashiInstance.clearInput("myInput");
        const result = await ayakashiInstance.evaluate<string>(function() {
            //@ts-ignore
            return document.getElementById("myInput").value;
        });
        expect(result).toBe("");
        await ayakashiInstance.__connection.release();
    });

    test("clear only some characters of an input", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myInput").where({id: {eq: "myInput"}});
        await ayakashiInstance.typeIn("myInput", "hey there");
        await ayakashiInstance.clearInput("myInput", 6);
        const result = await ayakashiInstance.evaluate<string>(function() {
            //@ts-ignore
            return document.getElementById("myInput").value;
        });
        expect(result).toBe("hey");
        await ayakashiInstance.__connection.release();
    });

});
