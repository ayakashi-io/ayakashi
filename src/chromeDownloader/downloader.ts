import request from "request";
import decompress from "decompress";
import {getOpLog} from "../opLog/opLog";
import {lstatSync} from "fs";
import rimraf from "rimraf";
import {resolve as pathResolve} from "path";

export function isChromiumAlreadyInstalled(projectFolder: string) {
    try {
        if (lstatSync(`${projectFolder}/.chromium`).isDirectory()) {
            return true;
        } else {
            return false;
        }
    } catch (e) {
        return false;
    }
}

export function cleanChromiumDirectory(projectFolder: string) {
    return new Promise(function(resolve, reject) {
        if (isChromiumAlreadyInstalled(projectFolder)) {
            rimraf(`${projectFolder}/.chromium`, function(err) {
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

export function downloadLatestChromium(projectFolder: string) {
    const opLog = getOpLog();
    let chromiumArch = "";
    if (process.platform === "win32") {
        if (process.arch === "x64") {
            chromiumArch = "Win_x64";
        } else if (process.arch === "x32") {
            chromiumArch = "Win";
        }
    }
    if (process.platform === "darwin") {
        chromiumArch = "Mac";
    }
    if (process.platform === "linux") {
        if (process.arch === "x64") {
            chromiumArch = "Linux_x64";
        } else if (process.arch === "x32") {
            chromiumArch = "Linux";
        }
    }
    if (!chromiumArch) {
        opLog.error("unsupported architecture:", process.platform, "-", process.arch);
        throw new Error("unsupported_architecture");
    }
    opLog.info("downloading latest chromium for", chromiumArch);
    return new Promise(function(resolve, reject) {
        const downloadStream = request.get(`https://download-chromium.appspot.com/dl/${chromiumArch}?type=snapshots`);
        let total = "0mb";
        let downloaded = 0;
        const waiter = opLog.waiter("0.0MB/0.0MB");
        const buffs: Buffer[] = [];
        downloadStream.on("response", function(resp) {
            total = toMb(parseInt(resp.headers["content-length"] || "0"));
        });
        downloadStream.on("data", function(chunk) {
            downloaded += chunk.length;
            if (typeof chunk === "string") {
                buffs.push(Buffer.from(chunk));
            } else {
                buffs.push(chunk);
            }
            waiter.text = `${toMb(downloaded)}/${total}`;
        });
        downloadStream.on("end", function() {
            waiter.text = "extracting...";
            decompress(Buffer.concat(buffs), `${projectFolder}/.chromium`, {strip: 1}).then(function() {
                waiter.succeed("done!");
                resolve();
            });
        });
        downloadStream.on("error", function(err) {
            waiter.fail(err.message);
            reject(err);
        });
    });
}

export function getChromePath(projectFolder: string) {
    let executable = "";
    if (process.platform === "linux") {
        executable = "chrome";
    } else if (process.platform === "darwin") {
        executable = "Chromium.app/Contents/MacOS/Chromium";
    } else if (process.platform === "win32") {
        executable = "chrome.exe";
    } else {
        throw new Error("invalid_platform");
    }
    return pathResolve(projectFolder, ".chromium", executable);
}

function toMb(bytes: number) {
    const mb = (bytes / 1000 / 1000).toFixed(3);
    return `${mb}MB`;
}
