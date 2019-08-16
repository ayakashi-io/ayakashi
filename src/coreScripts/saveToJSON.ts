import {getOpLog} from "../opLog/opLog";
import {join as pathJoin} from "path";
import {
    open as _open,
    stat as _stat,
    write as _write,
    truncate as _truncate,
    exists as _exists,
    writeFile as _writeFile,
    close as _close
} from "fs";
import _mkdirp from "mkdirp";
import {promisify} from "util";
const exists = promisify(_exists);
const writeFile = promisify(_writeFile);
const open = promisify(_open);
const stat = promisify(_stat);
const write = promisify(_write);
const truncate = promisify(_truncate);
const close = promisify(_close);
const mkdirp = promisify(_mkdirp);

export default async function(
    input: {
        [key: string]: unknown
    } | {
        [key: string]: unknown
    }[],
    params: {
        file?: string
    },
    system: {
        projectFolder: string,
        operationId: string,
        startDate: string
    }
) {
    const opLog = getOpLog();
    let extraction: {
        [key: string]: unknown;
    }[];
    if (Array.isArray(input)) {
        extraction = input.filter(inp => !!inp);
    } else {
        extraction = [input].filter(inp => !!inp);
    }
    if (!extraction || extraction.length === 0) {
        opLog.warn("saveToJSON: nothing to print");
        opLog.warn("Learn more here: https://ayakashi.io/docs/guide/builtin-saving-scripts.html");
        return;
    }
    if (extraction.some(ext => typeof ext !== "object")) {
        opLog.warn("saveToJSON: invalid extraction format. Extracted data must be wrapped in an object");
        opLog.warn("Learn more here: https://ayakashi.io/docs/guide/builtin-saving-scripts.html");
        return;
    }
    const dataFolder = pathJoin(system.projectFolder, "data", system.startDate);
    await mkdirp(dataFolder);
    const file = pathJoin(dataFolder, params.file || "data.json");

    let firstEntry = false;
    if (!await exists(file)) {
        await writeFile(file, "[]");
        firstEntry = true;
    }

    const st = await stat(file);
    await truncate(file, st.size - 1);
    const fd = await open(file, "a");

    let data = JSON.stringify(extraction, null, 4);
    data = data.substr(1, data.length);
    const ap = firstEntry ? Buffer.from(`\n${data}`) : Buffer.from(`,\n${data}`);
    await write(fd, ap, 0, ap.length);
    await close(fd);

    return input;
}
