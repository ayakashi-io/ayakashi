//tslint:disable
import "jest-extended";
//tslint:enable
import http from "http";
import {createStaticServer} from "../utils/startServer";
import {getRandomPort} from "../../src/utils/getRandomPort";
import {getAyakashiInstance} from "../utils/getApiAyakashiInstance";

let staticServerPort: number;
let staticServer: http.Server;

describe("request tests", function() {
    beforeAll(async function() {
        staticServerPort = await getRandomPort();
        staticServer = createStaticServer(staticServerPort, "some string data");
    });

    afterAll(function(done) {
        staticServer.close(function() {
            done();
        });
    });

    test("can issue a GET request to a text API", async function() {
        const ayakashiInstance = getAyakashiInstance();
        const result = await ayakashiInstance.get(`http://localhost:${staticServerPort}`);
        expect(result).toBeString();
        expect(result).toBe("some string data");
    });

    test("can issue a GET request to a JSON API", async function() {
        const ayakashiInstance = getAyakashiInstance();
        const result = await ayakashiInstance.get(`http://localhost:${staticServerPort}/json`);
        expect(result).toBeObject();
        expect(result.someData).toBe(1);
    });

    test("can issue a GET request to a JSON API with json params", async function() {
        const ayakashiInstance = getAyakashiInstance();
        const result = await ayakashiInstance.get(`http://localhost:${staticServerPort}/json`, {json: {test: true}});
        expect(result).toBeObject();
        expect(result.someData).toBe(1);
    });

    test("throws error if statusCode >= 400", async function() {
        const ayakashiInstance = getAyakashiInstance();
        try {
            await ayakashiInstance.get(`http://localhost:${staticServerPort}/error`);
        } catch (e) {
            expect(e.message).toBe("404 - there was an error");
        }
    });

    test("throws error if statusCode >= 500", async function() {
        const ayakashiInstance = getAyakashiInstance();
        try {
            await ayakashiInstance.get(`http://localhost:${staticServerPort}/500error`);
        } catch (e) {
            expect(e.message).toBe("500 - internal server error");
        }
    });
});
