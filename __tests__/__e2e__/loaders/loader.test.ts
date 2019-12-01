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

describe("loaders test", function() {
    beforeAll(async function() {
        staticServerPort = await getRandomPort();
        staticServer = createStaticServer(staticServerPort,
            `
            <html>
                <head>
                    <title>test page</title>
                </head>
                <body>
                    <span class="author" itemprop="author"><a class="url fn" rel="author" data-hovercard-type="organization" data-hovercard-url="/orgs/ayakashi-io/hovercard" href="/ayakashi-io">ayakashi-io</a></span>
                    <strong itemprop="name"><a data-pjax="#js-repo-pjax-container" href="/ayakashi-io/ayakashi">ayakashi</a></strong>
                    <span class="text-gray-dark mr-2" itemprop="about">
                        <g-emoji class="g-emoji" alias="zap" fallback-src="https://github.githubassets.com/images/icons/emoji/unicode/26a1.png">⚡️</g-emoji>
                        Ayakashi.io - The next generation web scraping framework
                    </span>
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

    test("loads all the files correctly", function(done) {
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
                type: "scraper",
                module: "githubInfo",
                config: {
                    retries: 5
                },
                load: {
                    actions: ["external_action1", "external_action2"]
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
        exec(`node lib/cli/cli.js run ./__tests__/__e2e__/loaders/test_files --clean --jsonConfig '${strConfig}'`, function() {
            const results: {
                name: string,
                author: string,
                actions: string[],
                extractors: string[],
                preloaders: string[]
            }[] = resultServer.getResults();
            expect(results[0].name).toBe("ayakashi");
            expect(results[0].author).toBe("ayakashi-io");

            expect(results[0].actions[0]).toBe("action1");
            expect(results[0].actions[1]).toBe("action2");
            expect(results[0].actions[2]).toBe("external_action1");
            expect(results[0].actions[3]).toBe("external_action2");

            expect(results[0].extractors[0]).toBe("extractor1");
            expect(results[0].extractors[1]).toBe("extractor2");

            expect(results[0].preloaders[0]).toBe("preloader1");
            expect(results[0].preloaders[1]).toBe("preloader2");
            expect(results[0].preloaders[2]).toBe("preloader3");
            done();
        });
    });
});
