import requestCore from "@ayakashi/request/core";
import {createConnection, IConnection} from "../engine/createConnection";
import {EmulatorOptions} from "../runner/parseConfig";
import {prelude, IAyakashiInstance} from "../prelude/prelude";
import {attachYields} from "../prelude/actions/yield";
import {attachRequest} from "../prelude/actions/request";
import {resolve as pathResolve} from "path";
import {PipeProc} from "pipeproc";
import {compile} from "../preloaderCompiler/compiler";
import {getOpLog} from "../opLog/opLog";
import {getBridgeClient} from "../bridge/client";
import {getCookieJar, updateCookieJar} from "./cookies";
import {
    getCookieUrl,
    toCookieString,
    getAllCookiesFromRequestJar,
    toChromeCookies,
    toRequestCookies
} from "../utils/cookieHelpers";

import {
    loadLocalActions,
    loadLocalExtractors,
    loadLocalPreloaders,
    loadLocalProps,
    loadExternalActions,
    loadExternalExtractors,
    loadExternalPreloaders
} from "./loaders";
import debug from "debug";
const d = debug("ayakashi:scraperWrapper");

type PassedLog = {
    id: string,
    body: {
        input: {value: unknown},
        params: object,
        config: {
            pipeConsole?: boolean,
            pipeExceptions?: boolean,
            localAutoLoad?: boolean,
            emulatorOptions?: EmulatorOptions,
            simple?: boolean
        },
        load: {
            extractors?: string[],
            actions?: string[],
            preloaders?: string[] | {
                module: string,
                as?: string,
                waitForDom?: boolean
            }[]
        },
        module: string,
        connectionConfig: {
            bridgePort: number,
            protocolPort: number
        },
        saveTopic: string,
        selfTopic: string,
        projectFolder: string,
        storeProjectFolder: string,
        persistentSession: boolean,
        operationId: string,
        startDate: string,
        procName: string,
        appRoot: string,
        userAgent?: string,
        proxyUrl?: string,
        ignoreCertificateErrors: boolean
    }
};

export default async function scraperWrapper(log: PassedLog) {
    try {
        const opLog = getOpLog();
        opLog.info("running scraper", log.body.module);
        const bridgeClient = getBridgeClient(log.body.connectionConfig.bridgePort);
        //get a tab and create a connection
        let tab;
        try {
            tab = await bridgeClient.getTarget();
            if (!tab) {
                throw new Error("no_target");
            }
        } catch (e) {
            d(e);
            opLog.error("Could not create a chrome target");
            throw e;
        }

        let connection: IConnection;
        try {
            connection = await createConnection(
                tab,
                log.body.connectionConfig.bridgePort,
                log.body.config.emulatorOptions
            );
            if (!connection) {
                throw new Error("no_connection");
            }
        } catch (e) {
            d(e);
            opLog.error("Could not create a connection");
            throw e;
        }
        //ignoreCertificateErrors option
        if (log.body.ignoreCertificateErrors) {
            await connection.client.Security.setIgnoreCertificateErrors({ignore: true});
        }
        //user-agent setup
        const userAgentData = await bridgeClient.getUserAgentData({
            agent: (log.body.config.emulatorOptions && log.body.config.emulatorOptions.userAgent) || undefined,
            platform: (log.body.config.emulatorOptions && log.body.config.emulatorOptions.platform) || undefined,
            persistentSession: log.body.persistentSession
        });
        if (!userAgentData) {
            throw new Error("could not generate userAgent");
        }
        const acceptLanguage = (log.body.config.emulatorOptions && log.body.config.emulatorOptions.acceptLanguage) || "en-US";
        await connection.client.Emulation.setUserAgentOverride({
            userAgent: userAgentData.userAgent,
            platform: userAgentData.platform,
            acceptLanguage: acceptLanguage
        });

        //get cookie jar
        const {jar, cookies} = await getCookieJar(log.body.connectionConfig.bridgePort, {
            persistentSession: log.body.persistentSession
        });
        //add all cookies from the jar to chrome
        if (cookies.length > 0) {
            await connection.client.Network.setCookies({
                cookies: toChromeCookies(cookies)
            });
        }
        //add all chrome cookies to jar and to the persistent store after every page load
        connection.unsubscribers.push(connection.client.Page.domContentEventFired(async function() {
            const chromeCookies = await connection.client.Network.getCookies();
            toRequestCookies(chromeCookies.cookies).forEach(function(chromeCookie) {
                jar.setCookie(toCookieString(chromeCookie), getCookieUrl(chromeCookie));
            });
            await updateCookieJar(log.body.connectionConfig.bridgePort, jar, {
                persistentSession: log.body.persistentSession
            });
        }));

        //check pipes and initialize the instance using the prelude
        if (log.body.config.pipeConsole !== false) {
            connection.pipe.console(function(text) {
                if (text && text.indexOf("[Ayakashi]") === -1) {
                    opLog.debug(`<Scraper:${log.body.module}:Browser>`, text);
                }
            });
        }
        if (log.body.config.pipeExceptions !== false) {
            connection.pipe.uncaughtException(function(exception) {
                opLog.debug(`<Scraper:${log.body.module}:Browser:Exception>`, JSON.stringify(exception, null, 2));
            });
        }
        const ayakashiInstance = await prelude(connection);

        //attach the request API
        const myRequest = requestCore.defaults({
            headers: {
                "User-Agent": userAgentData.userAgent,
                //tslint:disable max-line-length
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3",
                //tslint:enable max-line-length
                "accept-language": acceptLanguage,
                "cache-control": "no-cache",
                pragma: "no-cache"
            },
            proxy: log.body.proxyUrl || undefined,
            strictSSL: !log.body.ignoreCertificateErrors,
            gzipOrBrotli: true,
            timeout: 10000,
            jar: jar
        });
        attachRequest(ayakashiInstance, myRequest, async function() {
            const requestCookies = getAllCookiesFromRequestJar(jar);
            //sync request cookies with chrome
            if (requestCookies.length > 0) {
                await connection.client.Network.setCookies({
                    cookies: toChromeCookies(requestCookies)
                });
            }
            //sync request cookies with the persistent store
            await updateCookieJar(log.body.connectionConfig.bridgePort, jar, {
                persistentSession: log.body.persistentSession
            });
        });

        //connect to pipeproc
        const pipeprocClient = PipeProc();
        await pipeprocClient.connect({socket: `ipc://${pathResolve(log.body.storeProjectFolder, "run.sock")}`});

        //attach the yield methods
        const yieldWatcher = {yieldedAtLeastOnce: false};
        attachYields(ayakashiInstance, pipeprocClient, log.body.saveTopic, log.body.selfTopic, yieldWatcher);

        //load domQL as a preloader
        const domqlPreloader = await compile(
            log.body.appRoot,
            `./lib/domQL/domQL`,
            "ayakashi",
            `${log.body.storeProjectFolder}/.cache/preloaders/`
        );
        await connection.injectPreloader({compiled: domqlPreloader, as: "domQL", waitForDOM: false});

        //load findCssSelector as a preloader
        const findCssSelectorPreloader = await compile(
            log.body.appRoot,
            `@ayakashi/get-node-selector`,
            "ayakashi",
            `${log.body.storeProjectFolder}/.cache/preloaders/`
        );
        await connection.injectPreloader({
            compiled: findCssSelectorPreloader,
            as: "getNodeSelector",
            waitForDOM: false
        });
        //load detection patches
        const detectionPatches = await compile(
            log.body.appRoot,
            "./lib/detection/patch",
            "ayakashi",
            `${log.body.storeProjectFolder}/.cache/preloaders/`
        );
        await connection.injectPreloader({
            compiled: detectionPatches,
            as: "detectionPatches",
            waitForDOM: false
        });

        //load external actions/extractors/preloaders
        await loadExternals(connection, ayakashiInstance, log);

        //autoLoad local actions/extractors/preloaders
        if (log.body.config.localAutoLoad !== false) {
            await loadLocals(connection, ayakashiInstance, log);
        }

        //activate the connection and load the scraper
        await connection.activate();
        let scraperModule;
        try {
            if (log.body.config.simple) {
                scraperModule = require(pathResolve(log.body.projectFolder, log.body.module));
            } else {
                scraperModule = require(pathResolve(log.body.projectFolder, "scrapers", log.body.module));
            }
            if (typeof scraperModule !== "function") {
                scraperModule = scraperModule.default;
            }
            if (typeof scraperModule !== "function") {
                throw new Error(`Scraper <${log.body.module}> is not a function`);
            }
        } catch (e) {
            opLog.error(e.message);
            await connection.release();
            throw e;
        }
        //run the scraper
        let result;
        try {
            //@ts-ignore
            if (log.body.input && log.body.input.value && log.body.input.value.continue === true) delete log.body.input.value.continue;
            result = await scraperModule(ayakashiInstance, log.body.input.value || {}, log.body.params || {});
        } catch (e) {
            opLog.error(`There was an error while running scraper <${log.body.module}> -`, e.message, e.stack);
            await connection.release();
            throw e;
        }
        if (result) {
            await ayakashiInstance.yield(result);
        }
        if (!result && !yieldWatcher.yieldedAtLeastOnce) {
            await ayakashiInstance.yield({continue: true});
        }
        await connection.release();
    } catch (e) {
        d(e);
        throw e;
    }
}

async function loadExternals(
    connection: IConnection,
    ayakashiInstance: IAyakashiInstance,
    log: PassedLog
) {
    loadExternalActions(ayakashiInstance, log.body.load.actions);
    loadExternalExtractors(ayakashiInstance, log.body.load.extractors);
    await loadExternalPreloaders(
        connection,
        log.body.projectFolder,
        log.body.storeProjectFolder,
        log.body.load.preloaders
    );
}

async function loadLocals(
    connection: IConnection,
    ayakashiInstance: IAyakashiInstance,
    log: PassedLog
) {
    loadLocalProps(ayakashiInstance, log.body.projectFolder);
    loadLocalActions(ayakashiInstance, log.body.projectFolder);
    loadLocalExtractors(ayakashiInstance, log.body.projectFolder);
    await loadLocalPreloaders(connection, log.body.projectFolder, log.body.storeProjectFolder);
}
