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

describe("select tests", function() {
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

    test("trackMissingChildren ON", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
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
    });

    test("trackMissingChildren OFF", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
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
    });
});
