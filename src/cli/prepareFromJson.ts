import {getOpLog} from "../opLog/opLog";
import {getDirectory} from "./getDirectory";

export function prepareFromJson(dir: string, jsonConfig: string) {
    const opLog = getOpLog();
    const directory = getDirectory(dir);
    process.chdir(directory);
    opLog.info("running project:", directory);
    opLog.info("configFile: from json");
    try {
        return {
            config: JSON.parse(jsonConfig),
            directory: directory
        };
    } catch (_e) {
        opLog.error("Invalid json passed to --jsonConfig");
        return process.exit(1);
    }
}
