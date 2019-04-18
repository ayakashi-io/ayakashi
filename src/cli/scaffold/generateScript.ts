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

export async function generateScript(directory: string, name: string) {
    const opLog = getOpLog();
    let fileName: string;
    if (name.indexOf(".js") > -1) {
        fileName = name;
    } else {
        fileName = `${name}.js`;
    }
    const scriptsFolder = pathJoin(directory, "scripts");
    const filePath = pathJoin(scriptsFolder, fileName);
    if (await exists(filePath)) {
        opLog.error(`script <${name}> already exists in ${filePath}`);
        return;
    }
    opLog.info(`Created <${name}> in ${filePath}`);
    await mkdirp(scriptsFolder);
    const content = getContent();
    await writeFile(filePath, content);
}

function getContent() {
    return (
`module.exports = async function(input, params) {
    return {page: "https://github.com/ayakashi-io/ayakashi"};
};
`);
}
