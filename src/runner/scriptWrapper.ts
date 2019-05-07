import {resolve as pathResolve} from "path";
// import debug from "debug";
// const d = debug("ayakashi:scriptWrapper");
import {getOpLog} from "../opLog/opLog";

type PassedLog = {
    id: string,
    body: {
        input: object,
        params: object,
        module: string,
        saveTopic: string,
        projectFolder: string,
        operationId: string,
        startDate: string,
        procName: string,
        appRoot: string
    }
};

export default async function scriptWrapper(log: PassedLog) {
    const opLog = getOpLog();
    await opLog.info("running script", log.body.module);
    let scriptModule;
    try {
        if (["saveToSQL", "saveToJSON", "saveToCSV", "printToConsole"].indexOf(log.body.module) > -1) {
            scriptModule = require(pathResolve(log.body.appRoot, "lib", "coreScripts", log.body.module));
        } else {
            scriptModule = require(pathResolve(log.body.projectFolder, "scripts", log.body.module));
        }
        if (typeof scriptModule !== "function") {
            scriptModule = scriptModule.default;
        }
        if (typeof scriptModule !== "function") {
            throw new Error(`Script <${log.body.module}> is not a function`);
        }
    } catch (e) {
        opLog.error(e.message);
        throw e;
    }
    try {
        const result = await scriptModule(log.body.input || {}, log.body.params || {}, {
            projectFolder: log.body.projectFolder,
            operationId: log.body.operationId,
            startDate: log.body.startDate
        });
        if (result) {
            return result;
        } else {
            return {};
        }
    } catch (e) {
        opLog.error(`There was an error while running script <${log.body.module}> -`, e.message, e.stack);
        throw e;
    }
}
