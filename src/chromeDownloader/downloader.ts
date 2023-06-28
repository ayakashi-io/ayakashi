import request from "@ayakashi/request/core";
import requestPromise from "@ayakashi/request";
import {getOpLog} from "../opLog/opLog";
import {createWriteStream, unlink, chmodSync} from "fs";
import extractZip from "extract-zip";
import {getStoreDir} from "../store/store";
import {getChromePath, cleanChromiumDirectory, updateStoredRevision} from "../store/chromium";

export async function downloadChromium(
    options: {
        useExact: boolean,
        revision: string,
        useChannel: boolean,
        channel: "Stable" | "Beta" | "Dev" | "Canary" | ""
    },
    storedRevision: string
) {
    const opLog = getOpLog();
    let chromiumArch = "";
    let filename = "";
    if (process.platform === "win32") {
        if (process.arch === "x64") {
            chromiumArch = "win64";
            filename = "chrome-win64";
        } else if (process.arch === "x32") {
            chromiumArch = "win32";
            filename = "chrome-win32";
        }
    }
    if (process.platform === "darwin") {
        if (process.arch === "x64") {
            chromiumArch = "mac-x64";
            filename = "chrome-mac-x64";
        }
    }
    if (process.platform === "linux") {
        if (process.arch === "x64") {
            chromiumArch = "linux64";
            filename = "chrome-linux64";
        }
    }
    if (!chromiumArch) {
        opLog.error("unsupported architecture:", process.platform, "-", process.arch);
        throw new Error("unsupported_architecture");
    }
    let revision = options.revision;
    if (options.useChannel) {
        try {
            let versions = await requestPromise
            .get(`https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions.json`);
            versions = JSON.parse(versions);
            revision = versions.channels[options.channel].version;
        } catch (_e) {
            throw new Error("invalid_chromium_revision");
        }
    }
    opLog.info("downloading chrome", `${revision}`, "for", chromiumArch);
    if (storedRevision === revision) {
        opLog.info(`downloaded chrome is already at revision ${revision}`);
        return;
    }
    await cleanChromiumDirectory();
    const storeDir = await getStoreDir();
    return new Promise<void>(function(resolve, reject) {
        const downloadStream = request
        .get(`https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/${revision}/${chromiumArch}/${filename}.zip`);
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

const RECOMMENDED_CHROMIUM_REVISION_FALLBACK = "114.0.5735.133";
export async function getRecommendedChromiumRevision(): Promise<string> {
    try {
        //tslint:disable
        let text: string = await requestPromise
            .get("https://raw.githubusercontent.com/puppeteer/puppeteer/main/packages/puppeteer-core/src/revisions.ts");
        //tslint:enable
        text = text.replace(/\s+/g, "");
        const match = text.match(/{.*}/);
        if (!match) return RECOMMENDED_CHROMIUM_REVISION_FALLBACK;
        return match[0].split(":")[1].split(",")[0].replace(/'/g, "");
    } catch (_e) {
        return RECOMMENDED_CHROMIUM_REVISION_FALLBACK;
    }
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
