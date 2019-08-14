import Table from "cli-table";
import {getOpLog} from "../opLog/opLog";

export default async function(
    input: {
        [key: string]: unknown
    } | {
        [key: string]: unknown
    }[],
    _params: {},
    _system: {
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
        opLog.warn("printToConsole: nothing to print");
        opLog.warn("Learn more here: https://ayakashi.io/docs/guide/builtin-saving-scripts.html");
        return;
    }
    if (extraction.some(ext => typeof ext !== "object")) {
        opLog.warn("printToConsole: invalid extraction format. Extracted data must be wrapped in an object");
        opLog.warn("Learn more here: https://ayakashi.io/docs/guide/builtin-saving-scripts.html");
        return;
    }
    const table = new Table();
    extraction.forEach(function(e) {
        Object.entries(e).forEach(function([key, val]) {
            if (val === undefined || val === null) {
                table.push({[key]: ""});
            } else if (typeof val === "object") {
                table.push({[key]: truncate(JSON.stringify(val))});
            } else {
                table.push({[key]: truncate(String(val))});
            }
        });
    });
    process.stdout.write(`${table.toString()}\n`);

    return input;
}

function truncate(str: string) {
    const buff = Buffer.from(str);
    if (buff.byteLength > 80) {
        return buff.slice(0, 80).toString() + " ...";
    } else {
        return buff.toString();
    }
}
