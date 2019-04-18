import {sep, resolve as pathResolve} from "path";
import {lstatSync} from "fs";
import {getOpLog} from "../opLog/opLog";

export function getDirectory(dir: string, exitIfNotExists = true) {
    const opLog = getOpLog();
    let directory = pathResolve(dir);
    try {
        if (!lstatSync(directory).isDirectory()) {
            const splittedDir = directory.split(sep);
            splittedDir.pop();
            directory = splittedDir.join(sep);
            if (process.platform === "win32") {
                directory = directory.replace(/\\/g, "/");
            }
            return directory;
        } else {
            if (process.platform === "win32") {
                directory = directory.replace(/\\/g, "/");
            }
            return directory;
        }
    } catch (e) {
        if (exitIfNotExists) {
            opLog.error("invalid directory", directory);
            return process.exit(1);
        } else {
            return directory;
        }
    }
}
