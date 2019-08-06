//tslint:disable
import "jest-extended";
//tslint:enable
import http from "http";
import {createStaticServer} from "../utils/startServer";
import {getRandomPort} from "../utils/getRandomPort";
import {getAyakashiInstance} from "../utils/getRenderlessAyakashiInstance";

let staticServerPort: number;
let staticServer: http.Server;

jest.setTimeout(600000);

describe("defineProp tests", function() {
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

    afterAll(function(done) {
        staticServer.close(function() {
            done();
        });
    });

    test("use a simple prop", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        ayakashiInstance.defineProp(function() {
            return this.document.querySelectorAll(".links");
        }, "myLinkProp");
        const result = await ayakashiInstance.extract("myLinkProp");
        expect(result).toEqual([{
            myLinkProp: "link1"
        }, {
            myLinkProp: "link2"
        }, {
            myLinkProp: "link3"
        }]);
        await ayakashiInstance.__connection.release();
    });

    test("body prop should be already defined", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        expect(ayakashiInstance.prop("body")).not.toBeNull();
        await ayakashiInstance.__connection.release();
    });

    test("head prop should be already defined", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        expect(ayakashiInstance.prop("head")).not.toBeNull();
        await ayakashiInstance.__connection.release();
    });
});
