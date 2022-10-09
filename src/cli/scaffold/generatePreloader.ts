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
    const content = ts ? getContentTS(name) : getContent(name);
    await writeFile(filePath, content);
    opLog.info(`Created <${name}> in ${filePath}`);
}

function getContent(name: string) {
    return (
`//run it on load
// console.log(navigator.userAgent);

//or export it as a module to be available inside evaluate() calls
//as this.preloaders.${name}() or window.ayakashi.preloaders.${name}()

// module.exports = function() {
//     console.log(navigator.userAgent);
// };
`);
}

function getContentTS(name: string) {
    return (
`//run it on load
// console.log(navigator.userAgent);

//or export it as a module to be available inside evaluate() calls
//as this.preloaders.${name}() or window.ayakashi.preloaders.${name}()

//type definition, fill in actual type
// import {} from "@ayakashi/types/types/prelude/prelude";
// declare module "@ayakashi/types/types/prelude/prelude" {
//     export interface IPreloaders {
//         ${name}: () => string;
//     }
// }

// export default function() {
//     return navigator.userAgent;
// }
`);
}
