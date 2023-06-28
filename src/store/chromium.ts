import {lstatSync, readFileSync, writeFileSync} from "fs";
import {resolve as pathResolve} from "path";
import rimraf from "rimraf";
import {getStoreDir} from "./store";

export async function getStoredRevision() {
    const storeDir = await getStoreDir();
    try {
        if (!(await isCfT())) {
            return "";
        }
        return readFileSync(pathResolve(storeDir, "chromium", "revision"), "utf8");
    } catch (_e) {
        return "";
    }
}

export async function updateStoredRevision(newRevision: string) {
    const storeDir = await getStoreDir();
    writeFileSync(pathResolve(storeDir, "chromium", "revision"), newRevision);
}

export async function getChromePath() {
    let executable = "";
    let subfolder = "";
    if (process.platform === "linux") {
        executable = "chrome";
        subfolder = "chrome-linux64";
    } else if (process.platform === "darwin") {
        executable = "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
        subfolder = "chrome-mac-x64";
    } else if (process.platform === "win32") {
        executable = "chrome.exe";
        if (process.arch === "x64") {
            subfolder = "chrome-win64";
        } else {
            subfolder = "chrome-win32";
        }
    } else {
        throw new Error("invalid_platform");
    }
    const storeDir = await getStoreDir();
    return pathResolve(storeDir, "chromium", subfolder, executable);
}

export async function isChromiumAlreadyInstalled() {
    const storeDir = await getStoreDir();
    try {
        if (lstatSync(`${storeDir}/chromium`).isDirectory()) {
            return true;
        } else {
            return false;
        }
    } catch (e) {
        return false;
    }
}

export async function isCfT() {
    const storeDir = await getStoreDir();
    try {
        const revision = readFileSync(pathResolve(storeDir, "chromium", "revision"), "utf8");
        if (revision && revision.match(/\d+[.]\d+[.]\d+[.]\d+/)) {
            return true;
        } else {
            return false;
        }
    } catch (e) {
        return false;
    }
}

export async function cleanChromiumDirectory() {
    const storeDir = await getStoreDir();
    return new Promise<void>(async function(resolve, reject) {
        if (await isChromiumAlreadyInstalled()) {
            rimraf(`${storeDir}/chromium`, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        } else {
            resolve();
        }
    });
}
