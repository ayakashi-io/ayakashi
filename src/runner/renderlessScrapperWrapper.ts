import request from "request-promise-native";
import {resolve as pathResolve} from "path";
import {JSDOM} from "jsdom";
import {PipeProc} from "pipeproc";
import {renderlessPrelude} from "../prelude/renderlessPrelude";
import {getOpLog} from "../opLog/opLog";

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
        connectionConfig: {
            bridgePort: number,
            protocolPort: number
        },
        saveTopic: string,
        selfTopic: string,
        projectFolder: string,
        storeProjectFolder: string,
        operationId: string,
        startDate: string,
        procName: string,
        appRoot: string
    }
};

export default async function renderlessScrapperWrapper(log: PassedLog) {
    const opLog = getOpLog();
    opLog.info("running scrapper", log.body.module);

    const ayakashiInstance = await renderlessPrelude();

    ayakashiInstance.load = async function(url) {
        const html = await request.get(url);
        this.attachDOM(new JSDOM(html));
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
            await Promise.all(actualExtracted.map(ex => {
                return ayakashiInstance.yield(ex);
            }));
        } else {
            if (!Array.isArray(extracted) || extracted.length === 0) {
                opLog.warn("<yieldEach> requires an array");
                return;
            }
            await Promise.all(extracted.map(ex => {
                return ayakashiInstance.yield(ex);
            }));
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
        throw e;
    }
    if (result) {
        await ayakashiInstance.yield(result);
    }
    if (!result && !yieldedAtLeastOnce) {
        await ayakashiInstance.yield({continue: true});
    }
}
