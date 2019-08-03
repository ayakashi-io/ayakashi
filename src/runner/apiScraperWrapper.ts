import request from "@ayakashi/request/core";
import {resolve as pathResolve} from "path";
//@ts-ignore
import UserAgent from "user-agents";
import {PipeProc} from "pipeproc";
import {apiPrelude} from "../prelude/apiPrelude";
import {attachYields} from "../prelude/actions/yield";
import {getOpLog} from "../opLog/opLog";
import debug from "debug";
const d = debug("ayakashi:apiScraperWrapper");

type PassedLog = {
    id: string,
    body: {
        input: object,
        params: object,
        config: {
            simple?: boolean
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

export default async function apiScraperWrapper(log: PassedLog) {
    try {
        const opLog = getOpLog();
        opLog.info("running apiScraper", log.body.module);

        const ayakashiInstance = apiPrelude();

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
        const myRequest = request.defaults({
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

        ayakashiInstance.__wrap(myRequest, ["get", "post", "put", "patch", "delete", "head"]);

        //connect to pipeproc
        const pipeprocClient = PipeProc();
        await pipeprocClient.connect({namespace: "ayakashi"});

        //attach the yield methods
        const yieldWatcher = {yieldedAtLeastOnce: false};
        attachYields(ayakashiInstance, pipeprocClient, log.body.saveTopic, log.body.selfTopic, yieldWatcher);

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
            throw e;
        }
        if (result) {
            await ayakashiInstance.yield(result);
        }
        if (!result && !yieldWatcher.yieldedAtLeastOnce) {
            await ayakashiInstance.yield({continue: true});
        }
    } catch (e) {
        d(e);
        throw e;
    }
}
