import request from "request-promise-native";
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
import {getOpLog} from "../opLog/opLog";
import debug from "debug";
const d = debug("ayakashi:renderlessScrapperWrapper");

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
        operationId: string,
        startDate: string,
        procName: string,
        appRoot: string,
        userAgent?: string,
        proxyUrl?: string,
        ignoreCertificateErrors: boolean
    }
};

export default async function renderlessScrapperWrapper(log: PassedLog) {
    try {
        const opLog = getOpLog();
        opLog.info("running scrapper", log.body.module);

        const ayakashiInstance = await renderlessPrelude();

        ayakashiInstance.load = async function(url, timeout) {
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
                gzip: true
            });
            d("url loaded");
            d("building DOM");
            if (html) {
                this.attachDOM(new JSDOM(html));
                loadLocalProps(ayakashiInstance, log.body.projectFolder);
            } else {
                await ayakashiInstance.__connection.release();
                throw new Error("Invalid page");
            }
            d("DOM built");
        };
        //connect to pipeproc
        const pipeprocClient = PipeProc();
        await pipeprocClient.connect({namespace: "ayakashi"});

        //define the .yield() method
        let yieldedAtLeastOnce = false;
        ayakashiInstance.yield = async function(extracted) {
            if (extracted instanceof Promise) {
                const actualExtracted = await extracted;
                if (!actualExtracted || typeof actualExtracted !== "object") return;
                await pipeprocClient.commit({
                    topic: log.body.saveTopic,
                    body: actualExtracted
                });
                yieldedAtLeastOnce = true;
            } else {
                if (!extracted || typeof extracted !== "object") return;
                await pipeprocClient.commit({
                    topic: log.body.saveTopic,
                    body: extracted
                });
                yieldedAtLeastOnce = true;
            }
        };
        ayakashiInstance.yieldEach = async function(extracted) {
            if (extracted instanceof Promise) {
                const actualExtracted = await extracted;
                if (!Array.isArray(actualExtracted) || actualExtracted.length === 0) {
                    opLog.warn("<yieldEach> requires an array");
                    return;
                }
                await pipeprocClient.commit(actualExtracted.map(ex => {
                    return {
                        topic: log.body.saveTopic,
                        body: ex
                    };
                }));
                yieldedAtLeastOnce = true;
            } else {
                if (!Array.isArray(extracted) || extracted.length === 0) {
                    opLog.warn("<yieldEach> requires an array");
                    return;
                }
                await pipeprocClient.commit(extracted.map(ex => {
                    return {
                        topic: log.body.saveTopic,
                        body: ex
                    };
                }));
                yieldedAtLeastOnce = true;
            }
        };
        ayakashiInstance.recursiveYield = async function(extracted) {
            if (extracted instanceof Promise) {
                const actualExtracted = await extracted;
                if (!actualExtracted || typeof actualExtracted !== "object") return;
                await pipeprocClient.commit({
                    topic: log.body.selfTopic,
                    body: actualExtracted
                });
            } else {
                if (!extracted || typeof extracted !== "object") return;
                await pipeprocClient.commit({
                    topic: log.body.selfTopic,
                    body: extracted
                });
            }
        };

        loadExternalExtractors(ayakashiInstance, log.body.load.extractors);
        loadLocalExtractors(ayakashiInstance, log.body.projectFolder);

        let scrapperModule;
        try {
            if (log.body.config.simple) {
                scrapperModule = require(pathResolve(log.body.projectFolder, log.body.module));
            } else {
                scrapperModule = require(pathResolve(log.body.projectFolder, "scrappers", log.body.module));
            }
            if (typeof scrapperModule !== "function") {
                scrapperModule = scrapperModule.default;
            }
            if (typeof scrapperModule !== "function") {
                throw new Error(`Scrapper <${log.body.module}> is not a function`);
            }
        } catch (e) {
            opLog.error(e.message);
            await ayakashiInstance.__connection.release();
            throw e;
        }
        //run the scrapper
        let result;
        try {
            //@ts-ignore
            if (log.body.input && log.body.input.continue === true) delete log.body.input.continue;
            result = await scrapperModule(ayakashiInstance, log.body.input || {}, log.body.params || {});
        } catch (e) {
            opLog.error(`There was an error while running scrapper <${log.body.module}> -`, e.message, e.stack);
            await ayakashiInstance.__connection.release();
            throw e;
        }
        if (result) {
            await ayakashiInstance.yield(result);
        }
        if (!result && !yieldedAtLeastOnce) {
            await ayakashiInstance.yield({continue: true});
        }
        await ayakashiInstance.__connection.release();
    } catch (e) {
        d(e);
        throw e;
    }
}
