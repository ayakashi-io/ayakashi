import {getOpLog} from "../opLog/opLog";
import {join as pathJoin} from "path";
import {EOL} from "os";
import {Parser} from "json2csv";
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
const write = promisify(_write);
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
        opLog.warn("saveToCSV: nothing to print");
        opLog.warn("Learn more here: https://ayakashi-io.github.io/docs/guide/builtin-saving-scripts.html");
        return;
    }
    if (extraction.some(ext => typeof ext !== "object")) {
        opLog.warn("saveToCSV: invalid extraction format. Extracted data must be wrapped in an object");
        opLog.warn("Learn more here: https://ayakashi-io.github.io/docs/guide/builtin-saving-scripts.html");
        return;
    }
    const dataFolder = pathJoin(system.projectFolder, "data", system.startDate);
    await mkdirp(dataFolder);
    const file = pathJoin(dataFolder, params.file || "data.csv");

    const csvConfig = {
        header: true,
        flatten: true
    };

    if (!await exists(file)) {
        await writeFile(file, "");
    } else {
        csvConfig.header = false;
    }

    const parser = new Parser(csvConfig);
    const csv = parser.parse(extraction);

    const fd = await open(file, "a");
    const ap = Buffer.from(`${csv}${EOL}`);
    await write(fd, ap, 0, ap.length);
    await close(fd);

    return input;
}
