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
let anotherStaticServerPort: number;
let staticServer: http.Server;
let anotherStaticServer: http.Server;

let headlessChrome: IHeadlessChrome;
let bridgePort: number;
let protocolPort: number;

jest.setTimeout(600000);

describe("waiting tests", function() {
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
                <body></body>
            </html>
            `
        );
        anotherStaticServerPort = await getRandomPort();
        anotherStaticServer = createStaticServer(anotherStaticServerPort,
            `
            <html>
                <head>
                    <title>test page 2</title>
                </head>
                <body>
                    <a id="myLink" href="http://localhost:${staticServerPort}">Go to to the first test page</a>
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
    });

});
