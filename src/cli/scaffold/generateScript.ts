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

export async function generateScript(directory: string, name: string, ts: boolean) {
    const opLog = getOpLog();
    const ext = ts ? ".ts" : ".js";
    let fileName: string;
    if (name.indexOf(ext) > -1) {
        fileName = name;
    } else {
        fileName = `${name}${ext}`;
    }
    const scriptsFolder = pathJoin(directory, "scripts");
    const filePath = pathJoin(scriptsFolder, fileName);
    if (await exists(filePath)) {
        opLog.error(`script <${name}> already exists in ${filePath}`);
        return;
    }
    await mkdirp(scriptsFolder);
    const content = ts ? getContentTS() : getContent();
    await writeFile(filePath, content);
    opLog.info(`Created <${name}> in ${filePath}`);
}

function getContent() {
    return (
`module.exports = async function(input, params) {
    return {page: "https://github.com/ayakashi-io/ayakashi"};
};
`);
}

function getContentTS() {
    return (
`type ScriptInput = {};
type ScriptParams = {};

export default async function(input: ScriptInput, params: ScriptParams) {
    return {page: "https://github.com/ayakashi-io/ayakashi"};
}
`);
}
