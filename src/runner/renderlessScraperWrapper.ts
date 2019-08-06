import request from "@ayakashi/request";
import requestCore from "@ayakashi/request/core";
import {attachRequest} from "../prelude/actions/request";
import {resolve as pathResolve} from "path";
import {JSDOM} from "jsdom";
import {
    loadLocalExtractors,
    loadLocalProps,
    loadExternalExtractors
} from "./loaders";
//@ts-ignore
import UserAgent from "user-agents";
import {PipeProc} from "pipeproc";
import {renderlessPrelude} from "../prelude/renderlessPrelude";
import {attachYields} from "../prelude/actions/yield";
import {getOpLog} from "../opLog/opLog";
import debug from "debug";
const d = debug("ayakashi:renderlessScraperWrapper");

type PassedLog = {
    id: string,
    body: {
        input: object,
        params: object,
        config: {
            pipeConsole?: boolean,
            pipeExceptions?: boolean,
            localAutoLoad?: boolean,
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

        const ayakashiInstance = await renderlessPrelude();

        //user-agent setup
        let userAgent = "";
        if (!log.body.userAgent || log.body.userAgent === "random") {
            userAgent = new UserAgent();
        }
        if (log.body.userAgent && log.body.userAgent === "desktop") {
            userAgent = new UserAgent({deviceCategory: "desktop"});
        }
        if (log.body.userAgent && log.body.userAgent === "mobile") {
            userAgent = new UserAgent({deviceCategory: "mobile"});
        }

        //define the load methods
        ayakashiInstance.load = async function(url, timeout) {
            d("loading url: ", url);
            const html = await request.get(url, {
                headers: {
                    "User-Agent": userAgent.toString(),
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
                    "accept-language": "en-US,en;q=0.9"
                },
                proxy: log.body.proxyUrl || undefined,
                strictSSL: !log.body.ignoreCertificateErrors,
                timeout: timeout || 10000,
                gzipOrBrotli: true
            });
            d("url loaded");
            d("building DOM");
            if (html) {
                this.__attachDOM(new JSDOM(html));
                loadLocalProps(ayakashiInstance, log.body.projectFolder);
            } else {
                await ayakashiInstance.__connection.release();
                throw new Error("Invalid page");
            }
            d("DOM built");
        };
        ayakashiInstance.loadHtml = async function(html) {
            d("url loaded");
            d("building DOM");
            if (html) {
                this.__attachDOM(new JSDOM(html));
                loadLocalProps(ayakashiInstance, log.body.projectFolder);
            } else {
                await ayakashiInstance.__connection.release();
                throw new Error("Invalid page");
            }
            d("DOM built");
        };

        //attach the request API
        const myRequest = requestCore.defaults({
            headers: {
                "User-Agent": userAgent.toString(),
                //tslint:disable max-line-length
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3",
                //tslint:enable max-line-length
                "accept-language": "en-US,en;q=0.9",
                "cache-control": "no-cache",
                pragma: "no-cache"
            },
            proxy: log.body.proxyUrl || undefined,
            strictSSL: !log.body.ignoreCertificateErrors,
            gzipOrBrotli: true
        });
        attachRequest(ayakashiInstance, myRequest);

        //connect to pipeproc
        const pipeprocClient = PipeProc();
        await pipeprocClient.connect({namespace: "ayakashi"});

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
            if (log.body.input && log.body.input.continue === true) delete log.body.input.continue;
            result = await scraperModule(ayakashiInstance, log.body.input || {}, log.body.params || {});
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
