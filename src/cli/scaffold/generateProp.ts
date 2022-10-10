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

export async function generateProp(directory: string, name: string, ts: boolean) {
    const opLog = getOpLog();
    const ext = ts ? ".ts" : ".js";
    let fileName: string;
    if (name.indexOf(ext) > -1) {
        fileName = name;
    } else {
        fileName = `${name}${ext}`;
    }
    const propsFolder = pathJoin(directory, "props");
    const filePath = pathJoin(propsFolder, fileName);
    if (await exists(filePath)) {
        opLog.error(`prop <${name}> already exists in ${filePath}`);
        return;
    }
    await mkdirp(propsFolder);
    const content = ts ? getContentTS(name) : getContent(name);
    await writeFile(filePath, content);
    opLog.info(`Created <${name}> in ${filePath}`);
}

function getContent(name: string) {
    return (
`/**
 * @param {import("@ayakashi/types").IAyakashiInstance} ayakashi
 */
module.exports = function(ayakashi) {
    ayakashi
        .select("${name}")
        .where({id: {eq: "myId"}});
};
`);
}

function getContentTS(name: string) {
    return (
`import {IAyakashiInstance} from "@ayakashi/types";

export default function(ayakashi: IAyakashiInstance) {
    ayakashi
        .select("${name}")
        .where({id: {eq: "myId"}});
}
`);
}
