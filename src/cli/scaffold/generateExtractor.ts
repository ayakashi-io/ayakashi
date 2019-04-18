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

export async function generateExtractor(directory: string, name: string) {
    const opLog = getOpLog();
    let fileName: string;
    if (name.indexOf(".js") > -1) {
        fileName = name;
    } else {
        fileName = `${name}.js`;
    }
    const extractorsFolder = pathJoin(directory, "extractors");
    const filePath = pathJoin(extractorsFolder, fileName);
    if (await exists(filePath)) {
        opLog.error(`extractor <${name}> already exists in ${filePath}`);
        return;
    }
    opLog.info(`Created <${name}> in ${filePath}`);
    await mkdirp(extractorsFolder);
    const content = getContent(name);
    await writeFile(filePath, content);
}

function getContent(name: string) {
    return (
`/**
 * @param {import("@ayakashi/types").IAyakashiInstance} ayakashi
 */
module.exports = function(ayakashi) {
    ayakashi.registerExtractor("${name}", function() {
        return {
            extract: function(element) {
                return element.id;
            },
            isValid: function(result) {
                return !!result;
            },
            useDefault: function() {
                return "no-id-found";
            }
        };
    });
};
`);
}
