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

export async function generateAction(directory: string, name: string, ts: boolean) {
    const opLog = getOpLog();
    const ext = ts ? ".ts" : ".js";
    let fileName: string;
    if (name.indexOf(ext) > -1) {
        fileName = name;
    } else {
        fileName = `${name}${ext}`;
    }
    const actionsFolder = pathJoin(directory, "actions");
    const filePath = pathJoin(actionsFolder, fileName);
    if (await exists(filePath)) {
        opLog.error(`action <${name}> already exists in ${filePath}`);
        return;
    }
    await mkdirp(actionsFolder);
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

function getContentTS(name: string) {
    return (
`import {IAyakashiInstance, IDomProp} from "@ayakashi/types";

//action type definition, fill in actual type
declare module "@ayakashi/types/types/prelude/prelude" {
    export interface IAyakashiInstance {
        ${name}: (prop: IDomProp | string) => Promise<void>;
    }
}

export default function(ayakashi: IAyakashiInstance) {
    ayakashi.registerAction("${name}", async function(prop: IDomProp | string) {
        //prop boilerplate
        const myProp = this.prop(prop);
        if (!myProp) throw new Error("<${name}> needs a valid prop");
        const matchCount = await myProp.trigger();
        if (matchCount === 0) throw new Error("<${name}> needs a prop with at least 1 match");
        //do something with the prop
    });
}
`);
}
