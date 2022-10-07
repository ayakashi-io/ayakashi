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

export async function generateApiScraper(directory: string, name: string) {
    const opLog = getOpLog();
    let fileName: string;
    if (name.indexOf(".js") > -1) {
        fileName = name;
    } else {
        fileName = `${name}.js`;
    }
    const scrapersFolder = pathJoin(directory, "scrapers");
    const filePath = pathJoin(scrapersFolder, fileName);
    if (await exists(filePath)) {
        opLog.error(`scraper <${name}> already exists in ${filePath}`);
        return;
    }
    opLog.info(`Created <${name}> in ${filePath}`);
    await mkdirp(scrapersFolder);
    const content = getContent();
    await writeFile(filePath, content);
}

function getContent() {
    return (
`/**
* @param {import("@ayakashi/types").IApiAyakashiInstance} ayakashi
*/
module.exports = async function(ayakashi, input, params) {
    const res = await ayakashi.get("https://api.github.com/repos/ayakashi-io/ayakashi");
    const repoInfo = JSON.parse(res);

    return {
        name: repoInfo.name,
        author: repoInfo.owner.login
    };
};
`);
}
