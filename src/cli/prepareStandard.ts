import {getOpLog} from "../opLog/opLog";
import {getDirectory} from "./getDirectory";
import {resolve as pathResolve} from "path";

export function prepareStandard(dir: string, configFile: string) {
    const opLog = getOpLog();
    const directory = getDirectory(dir);
    process.chdir(directory);
    opLog.info("running project:", directory);
    opLog.info("configFile:", configFile);
    try {
        return {
            config: require(pathResolve(directory, configFile)),
            directory: directory
        };
    } catch (_e) {
        opLog.error("Could not find a valid ayakashi config file");
        return process.exit(1);
    }
}
