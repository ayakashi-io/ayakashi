import request from "request";
import {getOpLog} from "../opLog/opLog";
import {lstatSync, createWriteStream, createReadStream, unlink, chmodSync} from "fs";
import rimraf from "rimraf";
import {resolve as pathResolve} from "path";
import unzipper from "unzipper";

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

function cleanZipFile(zipPath: string) {
    return new Promise(function(resolve) {
        unlink(zipPath, function(_err) {
            resolve();
        });
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
        downloadStream.on("response", function(resp) {
            total = toMb(parseInt(resp.headers["content-length"] || "0"));
        });
        const fileStream = createWriteStream(`${projectFolder}/.chromium.zip`);
        downloadStream.pipe(fileStream);
        downloadStream.on("data", function(chunk) {
            downloaded += chunk.length;
            waiter.text = `${toMb(downloaded)}/${total}`;
        });
        downloadStream.on("end", function() {
            waiter.text = "extracting...";
            const zipStream = createReadStream(`${projectFolder}/.chromium.zip`);
            const unzipStream = unzipper.Extract({path: `${projectFolder}/.chromium`});
            zipStream.pipe(unzipStream);
            zipStream.on("error", async function(err) {
                waiter.fail(err.message);
                await cleanZipFile(`${projectFolder}/.chromium.zip`);
                reject(err);
            });
            unzipStream.on("error", async function(err) {
                waiter.fail(err.message);
                await cleanZipFile(`${projectFolder}/.chromium.zip`);
                await cleanChromiumDirectory(projectFolder);
                reject(err);
            });
            unzipStream.on("finish", async function() {
                waiter.succeed("done!");
                await cleanZipFile(`${projectFolder}/.chromium.zip`);
                const chromePath = getChromePath(projectFolder);
                chmodSync(chromePath,  0o755);
                resolve();
            });
        });
        downloadStream.on("error", async function(err) {
            waiter.fail(err.message);
            await cleanZipFile(`${projectFolder}/.chromium.zip`);
            reject(err);
        });
    });
}

export function getChromePath(projectFolder: string) {
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
    return pathResolve(projectFolder, ".chromium", subfolder, executable);
}

function toMb(bytes: number) {
    const mb = (bytes / 1000 / 1000).toFixed(3);
    return `${mb}MB`;
}
