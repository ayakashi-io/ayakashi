import {resolve as pathResolve} from "path";
import {promisify} from "util";
import {exec as _exec} from "child_process";
import semver from "semver";
import {getOpLog} from "../opLog/opLog";

const exec = promisify(_exec);
const opLog = getOpLog();

export async function refreshUA() {
    const localPath = process.cwd();
    const ayakashiPath = pathResolve(__dirname, "../..");
    try {
        process.chdir(ayakashiPath);
        const pkg = pathResolve(ayakashiPath, "node_modules", "user-agents", "package.json");
        const oldVersion = require(pkg).version;
        const latestVersion = (await exec("npm view user-agents dist-tags.latest")).stdout.trim();

        if (semver.gte(oldVersion, latestVersion)) {
            opLog.info("User agents are already up to date");
            return;
        }

        const waiter = opLog.waiter("Updating user-agents");
        await exec("npm update user-agents --legacy-peer-deps");
        delete require.cache[pkg];
        const newVersion = require(pkg).version;
        waiter.succeed(`User agents updated ${oldVersion} -> ${newVersion}`);
        process.chdir(localPath);
    } catch (_e) {
        process.chdir(localPath);
        opLog.error("Failed to update user agents. Builtin database will be used");
    }
}
