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

export async function generatePreloader(directory: string, name: string, ts: boolean) {
    const opLog = getOpLog();
    const ext = ts ? ".ts" : ".js";
    let fileName: string;
    if (name.indexOf(ext) > -1) {
        fileName = name;
    } else {
        fileName = `${name}${ext}`;
    }
    const preloadersFolder = pathJoin(directory, "preloaders");
    const filePath = pathJoin(preloadersFolder, fileName);
    if (await exists(filePath)) {
        opLog.error(`preloader <${name}> already exists in ${filePath}`);
        return;
    }
    await mkdirp(preloadersFolder);
    const content = ts ? getContentTS() : getContent();
    await writeFile(filePath, content);
    opLog.info(`Created <${name}> in ${filePath}`);
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

function getContentTS() {
    return (
`
//run it on load
// console.log(navigator.userAgent);

//or export it as a module to be available on window.ayakashi.preloaders
//and execute it on demand

//type definition, fill in actual type
// import {} from "@ayakashi/types/types/prelude/prelude";
// declare module "@ayakashi/types/types/prelude/prelude" {
//     export interface IPreloaders {
//         getUserAgent: () => string;
//     }
// }

// export default function getUserAgent() {
//     return navigator.userAgent;
// }
`);
}
