//tslint:disable
import "jest-extended";
//tslint:enable
import {getRandomPort} from "../../../../../src/utils/getRandomPort";
import {startResultServer, ResultServer} from "../../../../utils/resultServer";
import http from "http";
import {createStaticServer} from "../../../../utils/startServer";
import {Config} from "../../../../../src/runner/parseConfig";
import {stringifyConfig} from "../../../../utils/stringifyConfig";
import {exec} from "child_process";

let staticServerPort: number;
let staticServer: http.Server;

let resultServer: ResultServer;
let port: number;

jest.setTimeout(600000);

describe("cookies normal scraper", function() {
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

    test("when persistentSession is on, cookies are shared", function(done) {
        const config: Config = {
            config: {
                protocolPort: 0,
                bridgePort: 0,
                workers: 1,
                persistentSession: true
            },
            waterfall: [{
                type: "scraper",
                module: "setCookie",
                params: {
                    port: port,
                    staticServerPort: staticServerPort
                }
            }, {
                type: "apiScraper",
                module: "getCookieApi",
                params: {
                    port: port,
                    staticServerPort: staticServerPort
                }
            }, {
                type: "renderlessScraper",
                module: "getCookieRenderless",
                params: {
                    port: port,
                    staticServerPort: staticServerPort
                }
            }]
        };
        const strConfig = stringifyConfig(config);
        exec(`node lib/cli/cli.js run ./__tests__/__e2e__/persistentSession/cookies/normal/test_files --clean --jsonConfig '${strConfig}'`,
        function(err) {
            if (err) {
                return done.fail(err);
            }
            const results: {
                cookies: {
                    key: string,
                    value: string
                }[]
            }[] = resultServer.getResults();
            expect(results).toBeArrayOfSize(3);
            for (const result of results) {
                expect(result.cookies).toBeArrayOfSize(2);
                expect(result.cookies[0].value).toBe("test");
                expect(result.cookies[1].value).toBe("test");
                expect(result.cookies[0].key).not.toBe(result.cookies[1].key);
            }
            done();
        });
    });

    test("when persistentSession is off, cookies are NOT shared", function(done) {
        const config: Config = {
            config: {
                protocolPort: 0,
                bridgePort: 0,
                workers: 1
            },
            waterfall: [{
                type: "scraper",
                module: "setCookie",
                params: {
                    port: port,
                    staticServerPort: staticServerPort
                }
            }, {
                type: "apiScraper",
                module: "getCookieApi",
                params: {
                    port: port,
                    staticServerPort: staticServerPort
                }
            }, {
                type: "renderlessScraper",
                module: "getCookieRenderless",
                params: {
                    port: port,
                    staticServerPort: staticServerPort
                }
            }]
        };
        const strConfig = stringifyConfig(config);
        exec(`node lib/cli/cli.js run ./__tests__/__e2e__/persistentSession/cookies/normal/test_files --clean --jsonConfig '${strConfig}'`,
        function(err) {
            if (err) {
                return done.fail(err);
            }
            const results: {
                cookies: {
                    key: string,
                    value: string
                }[]
            }[] = resultServer.getResults();
            expect(results).toBeArrayOfSize(3);
            expect(results[0].cookies).toBeArrayOfSize(2);
            expect(results[0].cookies[0].value).toBe("test");
            expect(results[0].cookies[1].value).toBe("test");
            expect(results[0].cookies[0].key).not.toBe(results[0].cookies[1].key);

            expect(results[1].cookies).toBeArrayOfSize(0);
            expect(results[2].cookies).toBeArrayOfSize(0);
            done();
        });
    });

});
