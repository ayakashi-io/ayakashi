//tslint:disable
import "jest-extended";
//tslint:enable
import http from "http";
import {createStaticServer} from "../utils/startServer";
import {getRandomPort} from "../../src/utils/getRandomPort";
import {getAyakashiInstance} from "../utils/getRenderlessAyakashiInstance";

let staticServerPort: number;
let staticServer: http.Server;

jest.setTimeout(600000);

describe("join() tests", function() {
    beforeAll(async function() {
        staticServerPort = await getRandomPort();
        staticServer = createStaticServer(staticServerPort,
            `
            <html>
                <head>
                    <title>test page</title>
                </head>
                <body>
                    <div class="container">
                        <label>The link 1</label>
                        <a href="http://example.com" class="links">link1</a>
                    </div>
                    <div class="container">
                        <a href="http://example.com" class="links">link2</a>
                    </div>
                    <div class="container">
                        <label>The link 3</label>
                        <a href="http://example.com" class="links">link3</a>
                    </div>
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

    test("simple join", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        ayakashiInstance
            .select("myLinkProp")
            .where({
                class: {
                    eq: "links"
                }
            });
        const result = await ayakashiInstance.extract("myLinkProp");
        expect(result).toEqual(["link1", "link2", "link3"]);
        const joined = ayakashiInstance.join({
            text: result
        });
        expect(joined).toEqual([{
            text: "link1"
        }, {
            text: "link2"
        }, {
            text: "link3"
        }]);
        await ayakashiInstance.__connection.release();
    });

});
