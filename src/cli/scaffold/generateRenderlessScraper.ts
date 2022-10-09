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

export async function generateRenderlessScraper(directory: string, name: string, ts: boolean) {
    const opLog = getOpLog();
    const ext = ts ? ".ts" : ".js";
    let fileName: string;
    if (name.indexOf(ext) > -1) {
        fileName = name;
    } else {
        fileName = `${name}${ext}`;
    }
    const scrapersFolder = pathJoin(directory, "scrapers");
    const filePath = pathJoin(scrapersFolder, fileName);
    if (await exists(filePath)) {
        opLog.error(`scraper <${name}> already exists in ${filePath}`);
        return;
    }
    await mkdirp(scrapersFolder);
    const content = ts ? getContentTS() : getContent();
    await writeFile(filePath, content);
    opLog.info(`Created <${name}> in ${filePath}`);
}

function getContent() {
    return (
`/**
* @param {import("@ayakashi/types").IRenderlessAyakashiInstance} ayakashi
*/
module.exports = async function(ayakashi, input, params) {
    await ayakashi.load(input.page);
    ayakashi
        .select("name")
        .where({itemprop: {eq: "name"}});
    ayakashi
        .select("author")
        .where({itemprop: {eq: "author"}});

    return {
        name: await ayakashi.extractFirst("name"),
        author: await ayakashi.extractFirst("author")
    };
};
`);
}

function getContentTS() {
    return (
`import {IRenderlessAyakashiInstance} from "@ayakashi/types";

type ScraperInput = {page: string};
type ScraperParams = {};

export default async function(ayakashi: IRenderlessAyakashiInstance, input: ScraperInput, params: ScraperParams) {
    await ayakashi.load(input.page);
    ayakashi
        .select("name")
        .where({itemprop: {eq: "name"}});
    ayakashi
        .select("author")
        .where({itemprop: {eq: "author"}});

    return {
        name: await ayakashi.extractFirst("name"),
        author: await ayakashi.extractFirst("author")
    };
}
`);
}
