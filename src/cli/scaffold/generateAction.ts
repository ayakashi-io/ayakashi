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

export async function generateAction(directory: string, name: string) {
    const opLog = getOpLog();
    let fileName: string;
    if (name.indexOf(".js") > -1) {
        fileName = name;
    } else {
        fileName = `${name}.js`;
    }
    const actionsFolder = pathJoin(directory, "actions");
    const filePath = pathJoin(actionsFolder, fileName);
    if (await exists(filePath)) {
        opLog.error(`action <${name}> already exists in ${filePath}`);
        return;
    }
    opLog.info(`Created <${name}> in ${filePath}`);
    await mkdirp(actionsFolder);
    const content = getContent(name);
    await writeFile(filePath, content);
}

function getContent(name: string) {
    return (
`/**
 * @param {import("@ayakashi/types").IAyakashiInstance} ayakashi
 */
module.exports = function(ayakashi) {
    ayakashi.registerAction("${name}", async function(prop) {
        //prop boilerplate
        const myProp = this.prop(prop);
        if (!myProp) throw new Error("<${name}> needs a valid prop");
        const matchCount = await myProp.trigger();
        if (matchCount === 0) throw new Error("<${name}> needs a prop with at least 1 match");
        //do something with the prop
    });
};
`);
}
