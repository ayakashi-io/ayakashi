import {getOpLog} from "../opLog/opLog";
import {getDirectory} from "./getDirectory";
import {resolve as pathResolve, sep} from "path";
import {isTypescriptProject, getTypescriptDist, isTypescriptDistReady, buildTS} from "./tsHelpers";

export async function prepareStandard(dir: string, alternativeConfigFile: string, skipTsBuild: boolean) {
    const opLog = getOpLog();
    let directory = getDirectory(dir);
    //check if it's a ts project and use the dist directory
    const ts = await isTypescriptProject(directory);
    if (ts) {
        directory = await getTypescriptDist(directory);
        //we'll still compile if there is no dist folder even if the flag is set
        if (!skipTsBuild || !(await isTypescriptDistReady(directory))) {
            await buildTS();
        }
    }
    let resolvedConfigFile: string;
    if (alternativeConfigFile) {
        if (ts) {
            if (alternativeConfigFile.endsWith(".ts")) {
                let c = alternativeConfigFile.split(sep).pop() as string;
                c = c.replace(".ts", ".js");
                resolvedConfigFile = pathResolve(directory, c);
            } else {
                resolvedConfigFile = pathResolve(alternativeConfigFile);
            }
        } else {
            resolvedConfigFile = pathResolve(alternativeConfigFile);
        }
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
        process.exit(1);
    }
}
