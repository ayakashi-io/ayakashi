//tslint:disable
import "jest-extended";
//tslint:enable
import {getRandomPort} from "../../../src/utils/getRandomPort";
import {startResultServer, ResultServer} from "../../utils/resultServer";
import http from "http";
import {createStaticServer} from "../../utils/startServer";
import {Config} from "../../../src/runner/parseConfig";
import {stringifyConfig} from "../../utils/stringifyConfig";
import {exec} from "child_process";

let resultServer: ResultServer;
let port: number;
let staticServerPort: number;
let staticServer: http.Server;

jest.setTimeout(600000);

describe("smoke test api", function() {
    beforeAll(async function() {
        staticServerPort = await getRandomPort();
        staticServer = createStaticServer(staticServerPort, "");
    });

    beforeEach(async function() {
        port = await getRandomPort();
        resultServer = await startResultServer(port);
    });

    afterEach(async function() {
        return resultServer.close();
    });

    afterAll(function(done) {
        staticServer.close(function() {
            done();
        });
    });

    test("returns correct results", function(done) {
        const config: Config = {
            config: {
                protocolPort: 0,
                bridgePort: 0,
                workers: 1
            },
            waterfall: [{
                type: "script",
                module: "getPage",
                config: {
                    retries: 5
                },
                params: {
                    staticServerPort: staticServerPort
                }
            }, {
                type: "apiScraper",
                module: "getJson",
                config: {
                    retries: 5
                }
            }, {
                type: "script",
                module: "deliverResults",
                params: {
                    port: port
                },
                config: {
                    retries: 5
                }
            }]
        };
        const strConfig = stringifyConfig(config);
        exec(`node lib/cli/cli.js run ./__tests__/__e2e__/smoke_api/test_files --clean --jsonConfig '${strConfig}'`, function() {
            const results: {
                someData: 1
            }[] = resultServer.getResults();
            expect(results[0].someData).toBe(1);
            done();
        });
    });
});
