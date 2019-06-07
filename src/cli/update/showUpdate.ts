import {getOpLog} from "../../opLog/opLog";
import chalk from "chalk";
import semver from "semver";
import {isChromiumAlreadyInstalled, getStoredRevision} from "../../store/chromium";
import {getManifest} from "../../store/manifest";

const packageJson = require("../../../package.json");

export async function showBoxUpdate() {
    const opLog = getOpLog();
    const manifest = await getManifest();
    const storedRevision = await getStoredRevision();
    const box = opLog.incrementalMessageBox({color: "yellow", margin: 1});
    if (semver.gt(manifest.ayakashi.version, packageJson.version)) {
        box.add([
            "A new Ayakashi version is available",
            `${chalk.gray(packageJson.version)} → ${chalk.green(manifest.ayakashi.version)}`,
            "",
            `Run ${chalk.cyan("npm update -g ayakashi")} to update`,
            "",
            `See what's new at ${chalk.underline.yellowBright("https://changelog.ayakashi.io")}`
        ]);
    } else {
        if (!(await isChromiumAlreadyInstalled())) {
            box.add([
                "It seems Chromium is not installed",
                `Run ${chalk.cyan("ayakashi get-chrome")} to download it`
            ]);
        } else if (storedRevision < manifest.chromium.revision) {
            box.add([
                "A new recommended Chromium revision is available",
                `Run ${chalk.cyan("ayakashi update-chrome")} to update`
            ]);
        }
    }

    box.render();
}

export async function showLineUpdate() {
    const opLog = getOpLog();
    const manifest = await getManifest();
    const storedRevision = await getStoredRevision();
    if (semver.gt(manifest.ayakashi.version, packageJson.version)) {
        opLog.warn("A new Ayakashi version is available");
    }
    if (storedRevision < manifest.chromium.revision) {
        opLog.warn("A new recommended Chromium revision is available");
    }
}
