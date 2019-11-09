//tslint:disable
import "jest-extended";
//tslint:enable
import {getRandomPort} from "../../../../src/utils/getRandomPort";
import {startResultServer, ResultServer} from "../../../utils/resultServer";
import http from "http";
import {createStaticServer} from "../../../utils/startServer";
import {Config} from "../../../../src/runner/parseConfig";
import {stringifyConfig} from "../../../utils/stringifyConfig";
import {exec} from "child_process";

let staticServerPort: number;
let staticServer: http.Server;

let resultServer: ResultServer;
let port: number;

jest.setTimeout(600000);

describe("browserContext", function() {
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

    test("when not using browserContexts, the context is shared", function(done) {
        const config: Config = {
            config: {
                protocolPort: 0,
                bridgePort: 0,
                workers: 1,
                persistentSession: true
            },
            waterfall: [{
                type: "scraper",
                module: "setData",
                params: {
                    port: port,
                    staticServerPort: staticServerPort
                }
            }, {
                type: "scraper",
                module: "getData",
                params: {
                    port: port,
                    staticServerPort: staticServerPort
                }
            }]
        };
        const strConfig = stringifyConfig(config);
        exec(`node lib/cli/cli.js run ./__tests__/__e2e__/persistentSession/browserContext/test_files --clean --jsonConfig '${strConfig}'`,
        function(err) {
            if (err) {
                return done.fail(err);
            }
            const results: {
                myKey: string
            }[] = resultServer.getResults();
            expect(results[0].myKey).toBe("ayakashi");
            done();
        });
    });

    test("when using browserContexts, the context is isolated", function(done) {
        const config: Config = {
            config: {
                protocolPort: 0,
                bridgePort: 0,
                workers: 1
            },
            waterfall: [{
                type: "scraper",
                module: "setData",
                params: {
                    port: port,
                    staticServerPort: staticServerPort
                }
            }, {
                type: "scraper",
                module: "getData",
                params: {
                    port: port,
                    staticServerPort: staticServerPort
                }
            }]
        };
        const strConfig = stringifyConfig(config);
        exec(`node lib/cli/cli.js run ./__tests__/__e2e__/persistentSession/browserContext/test_files --clean --jsonConfig '${strConfig}'`,
        function(err) {
            if (err) {
                return done.fail(err);
            }
            const results: {
                myKey: null
            }[] = resultServer.getResults();
            expect(results[0].myKey).toBeNull();
            done();
        });
    });

});
