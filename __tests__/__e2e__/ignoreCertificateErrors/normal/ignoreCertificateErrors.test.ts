//tslint:disable
import "jest-extended";
//tslint:enable
import {getRandomPort} from "../../../../src/utils/getRandomPort";
import {startResultServer, ResultServer} from "../../../utils/resultServer";
import {Config} from "../../../../src/runner/parseConfig";
import {stringifyConfig} from "../../../utils/stringifyConfig";
import {exec} from "child_process";

let resultServer: ResultServer;
let port: number;

jest.setTimeout(600000);

describe("ignoreCertificateErrors", function() {
    beforeEach(async function() {
        port = await getRandomPort();
        resultServer = await startResultServer(port);
    });

    afterEach(async function() {
        return resultServer.close();
    });

    test("has no data if the flag is off", function(done) {
        const config: Config = {
            config: {
                protocolPort: 0,
                bridgePort: 0,
                workers: 1
            },
            waterfall: [{
                type: "scraper",
                module: "loadInvalidPage",
                params: {
                    port: port
                },
                config: {
                    retries: 5
                }
            }]
        };
        const strConfig = stringifyConfig(config);
        exec(`node lib/cli/cli.js run ./__tests__/__e2e__/ignoreCertificateErrors/normal/test_files --clean --jsonConfig '${strConfig}'`,
        function(err) {
            if (err) {
                return done.fail(err);
            }
            const results: {
                title: string
            }[] = resultServer.getResults();
            expect(results[0].title).toBe("");
            done();
        });
    });

    test("has data if the flag is on", function(done) {
        const config: Config = {
            config: {
                protocolPort: 0,
                bridgePort: 0,
                workers: 1,
                ignoreCertificateErrors: true
            },
            waterfall: [{
                type: "scraper",
                module: "loadInvalidPage",
                params: {
                    port: port
                },
                config: {
                    retries: 5
                }
            }]
        };
        const strConfig = stringifyConfig(config);
        exec(`node lib/cli/cli.js run ./__tests__/__e2e__/ignoreCertificateErrors/normal/test_files --clean --jsonConfig '${strConfig}'`,
        function(err) {
            if (err) {
                return done.fail(err);
            }
            const results: {
                title: string
            }[] = resultServer.getResults();
            expect(results[0].title).toBe("expired.badssl.com");
            done();
        });
    });
});
