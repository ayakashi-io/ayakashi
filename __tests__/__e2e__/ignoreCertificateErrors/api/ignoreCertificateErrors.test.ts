//tslint:disable
import "jest-extended";
//tslint:enable
import {getRandomPort} from "../../../../src/utils/getRandomPort";
import {startResultServer, ResultServer} from "../../../utils/resultServer";
import {Config} from "../../../../src/runner/parseConfig";
import {exec} from "child_process";

let resultServer: ResultServer;
let port: number;

jest.setTimeout(600000);

describe("ignoreCertificateErrors renderless", function() {
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
                type: "apiScraper",
                module: "loadInvalidPage",
                params: {
                    port: port
                }
            }]
        };
        let strConfig: string;
        if (process.platform === "win32") {
            strConfig = JSON.stringify(config).replace(/"/g, `\\"`);
        } else {
            strConfig = JSON.stringify(config);
        }
        exec(`node lib/cli/cli.js run ./__tests__/__e2e__/ignoreCertificateErrors/api/test_files --clean --jsonConfig '${strConfig}'`,
        function(err) {
            if (err) {
                return done.fail(err);
            }
            const results: {
                errorMessage: string
            }[] = resultServer.getResults();
            expect(results[0].errorMessage).toMatch("certificate has expired");
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
                type: "apiScraper",
                module: "loadInvalidPage",
                params: {
                    port: port
                }
            }]
        };
        let strConfig: string;
        if (process.platform === "win32") {
            strConfig = JSON.stringify(config).replace(/"/g, `\\"`);
        } else {
            strConfig = JSON.stringify(config);
        }
        exec(`node lib/cli/cli.js run ./__tests__/__e2e__/ignoreCertificateErrors/api/test_files --clean --jsonConfig '${strConfig}'`,
        function(err) {
            if (err) {
                return done.fail(err);
            }
            const results: {
                errorMessage: string
            }[] = resultServer.getResults();
            expect(results[0].errorMessage).toBe("");
            done();
        });
    });
});
