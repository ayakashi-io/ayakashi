import {lstatSync, readFileSync, writeFileSync} from "fs";
import {resolve as pathResolve} from "path";
import rimraf from "rimraf";
import {getStoreDir} from "./store";

export async function getStoredRevision() {
    const storeDir = await getStoreDir();
    try {
        const revision = readFileSync(pathResolve(storeDir, "chromium", "revision"), "utf8");
        return parseInt(revision, 10);
    } catch (_e) {
        return 0;
    }
}

export async function updateStoredRevision(newRevision: number) {
    const storeDir = await getStoreDir();
    writeFileSync(pathResolve(storeDir, "chromium", "revision"), newRevision);
}

export async function getChromePath() {
    let executable = "";
    let subfolder = "";
    if (process.platform === "linux") {
        executable = "chrome";
        subfolder = "chrome-linux";
    } else if (process.platform === "darwin") {
        executable = "Chromium.app/Contents/MacOS/Chromium";
        subfolder = "chrome-mac";
    } else if (process.platform === "win32") {
        executable = "chrome.exe";
        subfolder = "chrome-win";
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

export async function cleanChromiumDirectory() {
    const storeDir = await getStoreDir();
    return new Promise(async function(resolve, reject) {
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
