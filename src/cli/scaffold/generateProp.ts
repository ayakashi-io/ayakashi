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

export async function generateProp(directory: string, name: string) {
    const opLog = getOpLog();
    let fileName: string;
    if (name.indexOf(".js") > -1) {
        fileName = name;
    } else {
        fileName = `${name}.js`;
    }
    const propsFolder = pathJoin(directory, "props");
    const filePath = pathJoin(propsFolder, fileName);
    if (await exists(filePath)) {
        opLog.error(`prop <${name}> already exists in ${filePath}`);
        return;
    }
    opLog.info(`Created <${name}> in ${filePath}`);
    await mkdirp(propsFolder);
    const content = getContent(name);
    await writeFile(filePath, content);
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
