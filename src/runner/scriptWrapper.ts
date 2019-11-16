import {resolve as pathResolve} from "path";
import {PipeProc} from "pipeproc";
// import debug from "debug";
// const d = debug("ayakashi:scriptWrapper");
import {getOpLog} from "../opLog/opLog";

type PassedLog = {
    id: string,
    body: {
        input: {value: unknown},
        params: object,
        module: string,
        saveTopic: string,
        projectFolder: string,
        storeProjectFolder: string,
        operationId: string,
        startDate: string,
        procName: string,
        appRoot: string
    }
};

//tslint:disable
//@ts-ignore
const GeneratorFunction = Object.getPrototypeOf(function*(){}).constructor;
//@ts-ignore
const asyncGeneratorFunction = Object.getPrototypeOf(async function*(){}).constructor;
//tslint:enable

export default async function scriptWrapper(log: PassedLog) {
    const opLog = getOpLog();
    let scriptModule;
    try {
        if (["saveToSQL", "saveToJSON", "saveToCSV", "printToConsole"].indexOf(log.body.module) > -1) {
            //@ts-ignore
            if (log.body.input && log.body.input.value && log.body.input.value.continue === true) return {value: {continue: true}};
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
    //connect to pipeproc
    const pipeprocClient = PipeProc();
    await pipeprocClient.connect({socket: `ipc://${pathResolve(log.body.storeProjectFolder, "ipc")}`});
    opLog.info("running script", log.body.module);
    try {
        //@ts-ignore
        if (log.body.input && log.body.input.value && log.body.input.value.continue === true) delete log.body.input.value.continue;
        const result = await scriptModule(log.body.input.value || {}, log.body.params || {}, {
            projectFolder: log.body.projectFolder,
            operationId: log.body.operationId,
            startDate: log.body.startDate
        });
        if (result instanceof GeneratorFunction || result instanceof asyncGeneratorFunction) {
            //get generator results and commit them
            let committedAtLeastOnce = false;
            for await (const val of result()) {
                if (Array.isArray(val)) {
                    await pipeprocClient.commit(val.filter(v => v).map(v => {
                        return {
                            topic: log.body.saveTopic,
                            body: {value: v}
                        };
                    }));
                    committedAtLeastOnce = true;
                } else if (val) {
                    await pipeprocClient.commit({
                        topic: log.body.saveTopic,
                        body: {value: val}
                    });
                    committedAtLeastOnce = true;
                }
            }
            if (!committedAtLeastOnce) {
                return {value: {continue: true}};
            }
            return;
        } else if (Array.isArray(result)) {
            await pipeprocClient.commit(result.filter(re => re).map(re => {
                return {
                    topic: log.body.saveTopic,
                    body: {value: re}
                };
            }));
            return;
        } else if (result) {
            return {value: result};
        } else {
            return {value: {continue: true}};
        }
    } catch (e) {
        opLog.error(`There was an error while running script <${log.body.module}> -`, e.message, e.stack);
        throw e;
    }
}
