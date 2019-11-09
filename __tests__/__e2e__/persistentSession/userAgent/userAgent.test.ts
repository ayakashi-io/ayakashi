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

describe("userAgent", function() {
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

    test("when persistentSession is on, the userAgent is shared, waterfall", function(done) {
        const config: Config = {
            config: {
                protocolPort: 0,
                bridgePort: 0,
                workers: 1,
                persistentSession: true
            },
            waterfall: [{
                type: "scraper",
                module: "normal",
                params: {
                    port: port,
                    staticServerPort: staticServerPort
                },
                config: {
                    emulatorOptions: {
                        userAgent: "chrome-desktop",
                        platform: "Win32"
                    }
                }
            }, {
                type: "scraper",
                module: "normalFromHtml",
                params: {
                    port: port,
                    staticServerPort: staticServerPort
                },
                config: {
                    emulatorOptions: {
                        userAgent: "mobile",
                        platform: "iPhone"
                    }
                }
            }, {
                type: "renderlessScraper",
                module: "renderless",
                params: {
                    port: port,
                    staticServerPort: staticServerPort
                },
                config: {
                    emulatorOptions: {
                        userAgent: "chrome-mobile",
                        platform: "Linux armv7l"
                    }
                }
            }, {
                type: "apiScraper",
                module: "api",
                params: {
                    port: port,
                    staticServerPort: staticServerPort
                },
                config: {
                    emulatorOptions: {
                        userAgent: "desktop",
                        platform: "MacIntel"
                    }
                }
            }]
        };
        const strConfig = stringifyConfig(config);
        exec(`node lib/cli/cli.js run ./__tests__/__e2e__/persistentSession/userAgent/test_files --clean --jsonConfig '${strConfig}' --sessionKey=ua_1`,
        function(err) {
            if (err) {
                return done.fail(err);
            }
            const results: {
                ua: string
            }[] = resultServer.getResults();
            expect(results).toBeArrayOfSize(4);
            expect(results[0].ua).toBe(results[1].ua);
            expect(results[1].ua).toBe(results[2].ua);
            expect(results[2].ua).toBe(results[3].ua);
            done();
        });
    });

    test("when persistentSession is on, the userAgent is shared, parallel", function(done) {
        const config: Config = {
            config: {
                protocolPort: 0,
                bridgePort: 0,
                workers: 4,
                persistentSession: true
            },
            parallel: [{
                type: "scraper",
                module: "normal",
                params: {
                    port: port,
                    staticServerPort: staticServerPort
                },
                config: {
                    emulatorOptions: {
                        userAgent: "chrome-desktop",
                        platform: "Win32"
                    }
                }
            }, {
                type: "scraper",
                module: "normalFromHtml",
                params: {
                    port: port,
                    staticServerPort: staticServerPort
                },
                config: {
                    emulatorOptions: {
                        userAgent: "mobile",
                        platform: "iPhone"
                    }
                }
            }, {
                type: "renderlessScraper",
                module: "renderless",
                params: {
                    port: port,
                    staticServerPort: staticServerPort
                },
                config: {
                    emulatorOptions: {
                        userAgent: "chrome-mobile",
                        platform: "Linux armv7l"
                    }
                }
            }, {
                type: "apiScraper",
                module: "api",
                params: {
                    port: port,
                    staticServerPort: staticServerPort
                },
                config: {
                    emulatorOptions: {
                        userAgent: "desktop",
                        platform: "MacIntel"
                    }
                }
            }]
        };
        const strConfig = stringifyConfig(config);
        exec(`node lib/cli/cli.js run ./__tests__/__e2e__/persistentSession/userAgent/test_files --clean --jsonConfig '${strConfig}' --sessionKey=ua_2`,
        function(err) {
            if (err) {
                return done.fail(err);
            }
            const results: {
                ua: string
            }[] = resultServer.getResults();
            expect(results).toBeArrayOfSize(4);
            expect(results[0].ua).toBe(results[1].ua);
            expect(results[1].ua).toBe(results[2].ua);
            expect(results[2].ua).toBe(results[3].ua);
            done();
        });
    });

    test("when persistentSession is off, the userAgent is NOT shared, waterfall", function(done) {
        const config: Config = {
            config: {
                protocolPort: 0,
                bridgePort: 0,
                workers: 1
            },
            waterfall: [{
                type: "scraper",
                module: "normal",
                params: {
                    port: port,
                    staticServerPort: staticServerPort
                },
                config: {
                    emulatorOptions: {
                        userAgent: "chrome-desktop",
                        platform: "Win32"
                    }
                }
            }, {
                type: "scraper",
                module: "normalFromHtml",
                params: {
                    port: port,
                    staticServerPort: staticServerPort
                },
                config: {
                    emulatorOptions: {
                        userAgent: "mobile",
                        platform: "iPhone"
                    }
                }
            }, {
                type: "renderlessScraper",
                module: "renderless",
                params: {
                    port: port,
                    staticServerPort: staticServerPort
                },
                config: {
                    emulatorOptions: {
                        userAgent: "chrome-mobile",
                        platform: "Linux armv7l"
                    }
                }
            }, {
                type: "apiScraper",
                module: "api",
                params: {
                    port: port,
                    staticServerPort: staticServerPort
                },
                config: {
                    emulatorOptions: {
                        userAgent: "desktop",
                        platform: "MacIntel"
                    }
                }
            }]
        };
        const strConfig = stringifyConfig(config);
        exec(`node lib/cli/cli.js run ./__tests__/__e2e__/persistentSession/userAgent/test_files --clean --jsonConfig '${strConfig}' --sessionKey=ua_3`,
        function(err) {
            if (err) {
                return done.fail(err);
            }
            const results: {
                ua: string
            }[] = resultServer.getResults();
            expect(results).toBeArrayOfSize(4);
            expect(results[0].ua).not.toBe(results[1].ua);
            expect(results[0].ua).not.toBe(results[2].ua);
            expect(results[0].ua).not.toBe(results[3].ua);
            expect(results[1].ua).not.toBe(results[2].ua);
            expect(results[1].ua).not.toBe(results[3].ua);
            expect(results[2].ua).not.toBe(results[3].ua);
            done();
        });
    });

    test("when persistentSession is off, the userAgent is NOT shared, parallel", function(done) {
        const config: Config = {
            config: {
                protocolPort: 0,
                bridgePort: 0,
                workers: 4
            },
            parallel: [{
                type: "scraper",
                module: "normal",
                params: {
                    port: port,
                    staticServerPort: staticServerPort
                },
                config: {
                    emulatorOptions: {
                        userAgent: "chrome-desktop",
                        platform: "Win32"
                    }
                }
            }, {
                type: "scraper",
                module: "normalFromHtml",
                params: {
                    port: port,
                    staticServerPort: staticServerPort
                },
                config: {
                    emulatorOptions: {
                        userAgent: "mobile",
                        platform: "iPhone"
                    }
                }
            }, {
                type: "renderlessScraper",
                module: "renderless",
                params: {
                    port: port,
                    staticServerPort: staticServerPort
                },
                config: {
                    emulatorOptions: {
                        userAgent: "chrome-mobile",
                        platform: "Linux armv7l"
                    }
                }
            }, {
                type: "apiScraper",
                module: "api",
                params: {
                    port: port,
                    staticServerPort: staticServerPort
                },
                config: {
                    emulatorOptions: {
                        userAgent: "desktop",
                        platform: "MacIntel"
                    }
                }
            }]
        };
        const strConfig = stringifyConfig(config);
        exec(`node lib/cli/cli.js run ./__tests__/__e2e__/persistentSession/userAgent/test_files --clean --jsonConfig '${strConfig}' --sessionKey=ua_4`,
        function(err) {
            if (err) {
                return done.fail(err);
            }
            const results: {
                ua: string
            }[] = resultServer.getResults();
            expect(results).toBeArrayOfSize(4);
            expect(results[0].ua).not.toBe(results[1].ua);
            expect(results[0].ua).not.toBe(results[2].ua);
            expect(results[0].ua).not.toBe(results[3].ua);
            expect(results[1].ua).not.toBe(results[2].ua);
            expect(results[1].ua).not.toBe(results[3].ua);
            expect(results[2].ua).not.toBe(results[3].ua);
            done();
        });
    });

});
