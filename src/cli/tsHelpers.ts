import {resolve as pathResolve} from "path";
import {exec} from "child_process";
import {promisify} from "util";
import {readdir as _readdir, lstat as _lstat, readFile as _readFile} from "fs";
import {parse as jsonParse} from "json5";
import {getOpLog} from "../opLog/opLog";

const readdir = promisify(_readdir);
const lstat = promisify(_lstat);
const readFile = promisify(_readFile);
const opLog = getOpLog();

export async function isTypescriptProject(directory: string) {
    try {
        const pkg = require(pathResolve(directory, "package.json"));
        const dependencies = Object.keys(pkg.devDependencies || {})
            .concat(
                Object.keys(pkg.dependencies || {})
            );
        if (dependencies.includes("typescript")) {
            const files = await readdir(directory);
            const tsConfigFile = files.find(f => f.includes("tsconfig") && f.includes(".json"));
            if (tsConfigFile) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    } catch (e) {
        opLog.error("Could not determine project type. Is this an ayakashi project folder?");
        process.exit(1);
    }
}

export async function getTypescriptRoot(directory: string) {
    const files = await readdir(directory);
    const tsConfigFile = files.find(f => f.includes("tsconfig") && f.includes(".json"));
    if (!tsConfigFile) {
        opLog.error("Typescript project does not have a tsconfig.json");
        process.exit(1);
    }
    const tsConfigContent = await readFile(pathResolve(directory, tsConfigFile), "utf-8");
    const tsConfig = jsonParse(tsConfigContent);
    const root = tsConfig.compilerOptions.rootDir;

    if (!root) {
        opLog.error("tsconfig.json does not specify a rootDir");
        process.exit(1);
    }

    let result = pathResolve(directory, root);
    if (process.platform === "win32") {
        result = result.replace(/\\/g, "/");
    }
    return result;
}

export async function getTypescriptDist(directory: string) {
    const files = await readdir(directory);
    const tsConfigFile = files.find(f => f.includes("tsconfig") && f.includes(".json"));
    if (!tsConfigFile) {
        opLog.error("Typescript project does not have a tsconfig.json");
        process.exit(1);
    }
    const tsConfigContent = await readFile(pathResolve(directory, tsConfigFile), "utf-8");
    const tsConfig = jsonParse(tsConfigContent);
    const dist = tsConfig.compilerOptions.outDir;

    if (!dist) {
        opLog.error("tsconfig.json does not specify an outDir");
        process.exit(1);
    }

    let result = pathResolve(directory, dist);
    if (process.platform === "win32") {
        result = result.replace(/\\/g, "/");
    }
    return result;
}

export async function isTypescriptDistReady(directory: string) {
    try {
        const stats = await lstat(directory);
        if (!stats.isDirectory()) return false;
        const files = await readdir(directory);
        if (files.length === 0) return false;

        return true;
    } catch (_e) {
        return false;
    }
}

export function buildTS() {
    const waiter = opLog.waiter("compiling typescript");
    return new Promise<void>(function(resolve) {
        const ps = exec("npx tsc --pretty false");
        ps.stdout.on("data", function(d) {
            waiter.clear();
            process.stderr.write(d.toString());
        });
        ps.on("exit", function(code) {
            if (code) {
                waiter.warn("typescript compiled with errors");
            } else {
                waiter.succeed("typescript compiled");
            }
            resolve();
        });
    });
}
