import {promisify} from "util";
import {resolve as pathResolve} from "path";
import {rename as _rename} from "fs";
import {exec as _exec} from "child_process";
import {getOpLog} from "../opLog/opLog";

const exec = promisify(_exec);
const rename = promisify(_rename);
const opLog = getOpLog();

export async function updateStealthPatches() {
    const localPath = process.cwd();
    const stealthPath = pathResolve(__dirname, "../..", "lib", "detection");
    try {
        process.chdir(stealthPath);
        const waiter = opLog.waiter("Building detection patches, this might take a while");
        await exec("npx extract-stealth-evasions");
        await rename(pathResolve(stealthPath, "stealth.min.js"), pathResolve(stealthPath, "stealth.js"));
        waiter.succeed("done!");
        process.chdir(localPath);
    } catch (_e) {
        process.chdir(localPath);
        opLog.error("Failed to update detection patches. Builtin patches will be used");
    }
}
