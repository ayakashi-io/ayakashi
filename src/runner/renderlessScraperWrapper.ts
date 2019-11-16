import requestCore from "@ayakashi/request/core";
import {attachRequest} from "../prelude/actions/request";
import {resolve as pathResolve} from "path";
import {JSDOM} from "jsdom";
import {
    loadLocalExtractors,
    loadLocalProps,
    loadExternalExtractors
} from "./loaders";
import {PipeProc} from "pipeproc";
import {renderlessPrelude} from "../prelude/renderlessPrelude";
import {attachYields} from "../prelude/actions/yield";
import {attachCookieActions} from "../prelude/actions/cookies";
import {getOpLog} from "../opLog/opLog";
import {getBridgeClient} from "../bridge/client";
import {EmulatorOptions} from "../runner/parseConfig";
import {getCookieJar, updateCookieJar} from "./cookies";
import debug from "debug";
const d = debug("ayakashi:renderlessScraperWrapper");

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
            bridgePort: number
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

export default async function renderlessScraperWrapper(log: PassedLog) {
    try {
        const opLog = getOpLog();
        opLog.info("running renderlessScraper", log.body.module);
        const bridgeClient = getBridgeClient(log.body.connectionConfig.bridgePort);

        const ayakashiInstance = await renderlessPrelude();

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

        //get cookie jar
        const {jar} = await getCookieJar(log.body.connectionConfig.bridgePort, {
            persistentSession: log.body.persistentSession
        });

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
        async function cookieSync() {
            //sync request cookies with the persistent store
            await updateCookieJar(log.body.connectionConfig.bridgePort, jar, {
                persistentSession: log.body.persistentSession
            });
        }
        attachRequest(ayakashiInstance, myRequest, cookieSync);
        attachCookieActions(ayakashiInstance, jar, null, cookieSync);

        //define the load methods
        ayakashiInstance.load = async function(url, timeout) {
            d("loading url: ", url);
            const html = await ayakashiInstance.get(url, {
                timeout: timeout || 10000
            });
            d("url loaded");
            d("building DOM");
            if (html) {
                await this.__attachDOM(new JSDOM(html));
                loadLocalProps(ayakashiInstance, log.body.projectFolder);
            } else {
                await ayakashiInstance.__connection.release();
                throw new Error("Invalid page");
            }
            d("DOM built");
        };
        ayakashiInstance.loadHtml = async function(html) {
            d("building DOM");
            if (html) {
                await this.__attachDOM(new JSDOM(html));
                loadLocalProps(ayakashiInstance, log.body.projectFolder);
            } else {
                await ayakashiInstance.__connection.release();
                throw new Error("Invalid page");
            }
            d("DOM built");
        };

        //connect to pipeproc
        const pipeprocClient = PipeProc();
        await pipeprocClient.connect({socket: `ipc://${pathResolve(log.body.storeProjectFolder, "ipc")}`});

        //attach the yield methods
        const yieldWatcher = {yieldedAtLeastOnce: false};
        attachYields(ayakashiInstance, pipeprocClient, log.body.saveTopic, log.body.selfTopic, yieldWatcher);

        loadExternalExtractors(ayakashiInstance, log.body.load.extractors);
        loadLocalExtractors(ayakashiInstance, log.body.projectFolder);

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
            await ayakashiInstance.__connection.release();
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
            await ayakashiInstance.__connection.release();
            throw e;
        }
        if (result) {
            await ayakashiInstance.yield(result);
        }
        if (!result && !yieldWatcher.yieldedAtLeastOnce) {
            await ayakashiInstance.yield({continue: true});
        }
        await ayakashiInstance.__connection.release();
    } catch (e) {
        d(e);
        throw e;
    }
}
