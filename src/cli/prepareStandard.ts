import {getOpLog} from "../opLog/opLog";
import {getDirectory} from "./getDirectory";
import {resolve as pathResolve} from "path";

export function prepareStandard(dir: string, alternativeConfigFile: string) {
    const opLog = getOpLog();
    const directory = getDirectory(dir);
    let resolvedConfigFile: string;
    //if an alternative configFile is given, we resolve it based on the cwd
    //else we look in the project folder
    if (alternativeConfigFile) {
        resolvedConfigFile = pathResolve(process.cwd(), alternativeConfigFile);
    } else {
        resolvedConfigFile = pathResolve(directory, "ayakashi.config.js");
    }
    opLog.info("running project:", directory);
    opLog.info("configFile:", resolvedConfigFile);
    try {
        let config = require(resolvedConfigFile);
        if (config.default) config = config.default;
        return {
            config: config,
            directory: directory
        };
    } catch (_e) {
        opLog.error("Could not find a valid ayakashi config file");
        return process.exit(1);
    }
}
