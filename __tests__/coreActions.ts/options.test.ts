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

describe("options tests", function() {
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
                    <input type="checkbox" id="myCheckedCheckBox" checked>Already checked for you</input>
                    <input type="checkbox" id="myCheckBox">Check this one yourself</input>
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

    test("check a checkbox", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myCheckBox").where({id: {eq: "myCheckBox"}});
        await ayakashiInstance.check("myCheckBox");
        const result = await ayakashiInstance.evaluate<boolean>(function() {
            //@ts-ignore
            return document.getElementById("myCheckBox").checked;
        });
        expect(result).toBe(true);
        await ayakashiInstance.__connection.release();
    });

    test("check a an already checked checkbox", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myCheckedCheckBox").where({id: {eq: "myCheckedCheckBox"}});
        await ayakashiInstance.check("myCheckedCheckBox");
        const result = await ayakashiInstance.evaluate<boolean>(function() {
            //@ts-ignore
            return document.getElementById("myCheckedCheckBox").checked;
        });
        expect(result).toBe(true);
        await ayakashiInstance.__connection.release();
    });

    test("uncheck a an already checked checkbox", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myCheckedCheckBox").where({id: {eq: "myCheckedCheckBox"}});
        await ayakashiInstance.uncheck("myCheckedCheckBox");
        const result = await ayakashiInstance.evaluate<boolean>(function() {
            //@ts-ignore
            return document.getElementById("myCheckedCheckBox").checked;
        });
        expect(result).toBe(false);
        await ayakashiInstance.__connection.release();
    });

    test("uncheck an unchecked checkbox", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myCheckBox").where({id: {eq: "myCheckBox"}});
        await ayakashiInstance.uncheck("myCheckBox");
        const result = await ayakashiInstance.evaluate<boolean>(function() {
            //@ts-ignore
            return document.getElementById("myCheckBox").checked;
        });
        expect(result).toBe(false);
        await ayakashiInstance.__connection.release();
    });

});
