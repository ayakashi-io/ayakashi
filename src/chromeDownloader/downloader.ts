import request from "@ayakashi/request/core";
import {getOpLog} from "../opLog/opLog";
import {createWriteStream, unlink, chmodSync} from "fs";
import extractZip from "extract-zip";
import {getStoreDir} from "../store/store";
import {getChromePath, cleanChromiumDirectory, updateStoredRevision} from "../store/chromium";

export async function downloadChromium(revision: number) {
    const opLog = getOpLog();
    let chromiumArch = "";
    let filename = "";
    if (process.platform === "win32") {
        if (process.arch === "x64") {
            chromiumArch = "Win_x64";
        } else if (process.arch === "x32") {
            chromiumArch = "Win";
        }
        filename = "chrome-win";
    }
    if (process.platform === "darwin") {
        chromiumArch = "Mac";
        filename = "chrome-mac";
    }
    if (process.platform === "linux") {
        if (process.arch === "x64") {
            chromiumArch = "Linux_x64";
        } else if (process.arch === "x32") {
            throw new Error("Linux_x32 is not supported");
        }
        filename = "chrome-linux";
    }
    if (!chromiumArch) {
        opLog.error("unsupported architecture:", process.platform, "-", process.arch);
        throw new Error("unsupported_architecture");
    }
    opLog.info("downloading latest chromium for", chromiumArch);
    const storeDir = await getStoreDir();
    return new Promise<void>(function(resolve, reject) {
        const downloadStream = request
        .get(`https://storage.googleapis.com/chromium-browser-snapshots/${chromiumArch}/${revision}/${filename}.zip`);
        let total = "0mb";
        let downloaded = 0;
        const waiter = opLog.waiter("0.0MB/0.0MB");
        downloadStream.on("response", function(resp) {
            total = toMb(parseInt(resp.headers["content-length"] || "0"));
        });
        const fileStream = createWriteStream(`${storeDir}/chromium.zip`);
        downloadStream.pipe(fileStream);
        downloadStream.on("data", function(chunk) {
            downloaded += chunk.length;
            waiter.text = `${toMb(downloaded)}/${total}`;
        });
        downloadStream.on("end", function() {
            waiter.text = "extracting...";
            extractZip(`${storeDir}/chromium.zip`, {dir: `${storeDir}/chromium`}, async function(err) {
                if (err) {
                    waiter.fail(err.message);
                    await cleanChromiumDirectory();
                    await cleanZipFile(`${storeDir}/chromium.zip`);
                    reject(err);
                } else {
                    await cleanZipFile(`${storeDir}/chromium.zip`);
                    const chromePath = await getChromePath();
                    chmodSync(chromePath,  0o755);
                    await updateStoredRevision(revision);
                    waiter.succeed("done!");
                    resolve();
                }
            });
        });
        downloadStream.on("error", async function(err) {
            waiter.fail(err.message);
            await cleanZipFile(`${storeDir}/chromium.zip`);
            reject(err);
        });
    });
}

function toMb(bytes: number) {
    const mb = (bytes / 1000 / 1000).toFixed(3);
    return `${mb}MB`;
}

function cleanZipFile(zipPath: string) {
    return new Promise<void>(function(resolve) {
        unlink(zipPath, function(_err) {
            resolve();
        });
    });
}
