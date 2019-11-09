//tslint:disable
import "jest-extended";
//tslint:enable
import {getRandomPort} from "../../../src/utils/getRandomPort";
import {startResultServer, ResultServer} from "../../utils/resultServer";
import {Config} from "../../../src/runner/parseConfig";
import {stringifyConfig} from "../../utils/stringifyConfig";
import {exec} from "child_process";

let resultServer: ResultServer;
let port: number;

jest.setTimeout(600000);

describe("smoke test renderless", function() {
    beforeEach(async function() {
        port = await getRandomPort();
        resultServer = await startResultServer(port);
    });

    afterEach(async function() {
        return resultServer.close();
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
                module: "getPage"
            }, {
                type: "renderlessScraper",
                module: "githubInfo"
            }, {
                type: "script",
                module: "deliverResults",
                params: {
                    port: port
                }
            }]
        };
        const strConfig = stringifyConfig(config);
        exec(`node lib/cli/cli.js run ./__tests__/__e2e__/smoke_renderless/test_files --clean --jsonConfig '${strConfig}'`, function() {
            const results: {
                name: string
            }[] = resultServer.getResults();
            expect(results[0].name).toBe("ayakashi");
            done();
        });
    });
});
