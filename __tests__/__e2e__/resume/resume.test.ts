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
import {tmpdir} from "os";
import {writeFileSync, unlinkSync} from "fs";

let resultServer: ResultServer;
let port: number;
let staticServerPort: number;
let staticServer: http.Server;

jest.setTimeout(600000);

describe("resume", function() {
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

    test("should be able to resume after a failure", function(done) {
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
                    //we still add some retries to make sure we fail for the right reasons
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
        //create an empty file as a signal to the scraper
        writeFileSync(`${tmpdir()}/ayakashi_resume_test`, "");
        exec(`node lib/cli/cli.js run ./__tests__/__e2e__/resume/test_files --clean --jsonConfig '${strConfig}'`, function() {
            const results: {
                name: string
            }[] = resultServer.getResults();
            expect(results).toBeEmpty();
            //remove the file so the scraper won't throw again
            unlinkSync(`${tmpdir()}/ayakashi_resume_test`);
            //re-run with the --resume and --restartDisabledSteps flags
            exec(`node lib/cli/cli.js run ./__tests__/__e2e__/resume/test_files --resume --restartDisabledSteps --jsonConfig '${strConfig}'`, function() {
                const results2: {
                    name: string
                }[] = resultServer.getResults();
                expect(results2[0]).toBeObject();
                expect(results2[0].name).toBe("ayakashi");
                done();
            });
        });
    });
});
