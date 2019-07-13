import request from "@ayakashi/request";
import {resolve as pathResolve} from "path";
//@ts-ignore
import UserAgent from "user-agents";
import {PipeProc} from "pipeproc";
import {apiPrelude} from "../prelude/apiPrelude";
import {attachYields} from "../prelude/actions/yield";
import {getOpLog} from "../opLog/opLog";
import debug from "debug";
const d = debug("ayakashi:apiScrapperWrapper");

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

export default async function apiScrapperWrapper(log: PassedLog) {
    try {
        const opLog = getOpLog();
        opLog.info("running apiScrapper", log.body.module);

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
                Accept: "*/*",
                "accept-language": "en-US,en;q=0.9",
                "content-type": "application/json"
            },
            proxy: log.body.proxyUrl || undefined,
            strictSSL: !log.body.ignoreCertificateErrors,
            gzipOrBrotli: true
        });

        ayakashiInstance.get = myRequest.get;
        ayakashiInstance.post = myRequest.post;
        ayakashiInstance.put = myRequest.put;
        ayakashiInstance.patch = myRequest.patch;
        ayakashiInstance.delete = myRequest.delete;
        ayakashiInstance.head = myRequest.head;

        //connect to pipeproc
        const pipeprocClient = PipeProc();
        await pipeprocClient.connect({namespace: "ayakashi"});

        //attach the yield methods
        const yieldWatcher = {yieldedAtLeastOnce: false};
        attachYields(ayakashiInstance, pipeprocClient, log.body.saveTopic, log.body.selfTopic, yieldWatcher);

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
        if (!result && !yieldWatcher.yieldedAtLeastOnce) {
            await ayakashiInstance.yield({continue: true});
        }
    } catch (e) {
        d(e);
        throw e;
    }
}
