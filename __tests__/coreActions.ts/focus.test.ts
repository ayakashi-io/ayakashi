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

describe("focusing tests", function() {
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
                    <input type="text" id="myInput"></input>
                    <script>
                        const myInput = document.getElementById("myInput");
                        window.counter = 0;
                        myInput.addEventListener("focus", function () {
                            counter += 1;
                        });
                    </script>
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

    test("focus on an input field", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort);
        await ayakashiInstance.goTo(`http://localhost:${staticServerPort}`);
        ayakashiInstance.selectOne("myInput").where({id: {eq: "myInput"}});
        await ayakashiInstance.focus("myInput");
        const result = await ayakashiInstance.evaluate<number>(function() {
            //@ts-ignore
            return window.counter;
        });
        expect(result).toBe(1);
        await ayakashiInstance.__connection.release();
    });

});
