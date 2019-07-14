import _mkdirp from "mkdirp";
import {promisify} from "util";
import {join as pathJoin} from "path";
import {
    writeFile as _writeFile,
    exists as _exists
} from "fs";
import {getOpLog} from "../../opLog/opLog";

const mkdirp = promisify(_mkdirp);
const writeFile = promisify(_writeFile);
const exists = promisify(_exists);

export async function generateApiScrapper(directory: string, name: string) {
    const opLog = getOpLog();
    let fileName: string;
    if (name.indexOf(".js") > -1) {
        fileName = name;
    } else {
        fileName = `${name}.js`;
    }
    const scrappersFolder = pathJoin(directory, "scrappers");
    const filePath = pathJoin(scrappersFolder, fileName);
    if (await exists(filePath)) {
        opLog.error(`scrapper <${name}> already exists in ${filePath}`);
        return;
    }
    opLog.info(`Created <${name}> in ${filePath}`);
    await mkdirp(scrappersFolder);
    const content = getContent();
    await writeFile(filePath, content);
}

function getContent() {
    return (
`/**
* @param {import("@ayakashi/types").IApiAyakashiInstance} ayakashi
*/
module.exports = async function(ayakashi, input, params) {
    const manifest = await ayakashi.get("https://ayakashi.io/manifest.json");
    console.log("Latest Ayakashi version:", manifest.ayakashi.version);
};
`);
}
