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

export async function generatePreloader(directory: string, name: string) {
    const opLog = getOpLog();
    let fileName: string;
    if (name.indexOf(".js") > -1) {
        fileName = name;
    } else {
        fileName = `${name}.js`;
    }
    const preloadersFolder = pathJoin(directory, "preloaders");
    const filePath = pathJoin(preloadersFolder, fileName);
    if (await exists(filePath)) {
        opLog.error(`preloader <${name}> already exists in ${filePath}`);
        return;
    }
    opLog.info(`Created <${name}> in ${filePath}`);
    await mkdirp(preloadersFolder);
    const content = getContent();
    await writeFile(filePath, content);
}

function getContent() {
    return (
`//console.log(navigator.userAgent);
//or export it as a module to be available on window.ayakashi.preloaders
//and execute it on demand
// module.exports = function() {
//     console.log(navigator.userAgent);
// };
`);
}
