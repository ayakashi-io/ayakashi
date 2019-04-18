import Table from "cli-table";
import normalizeExtraction from "./normalizeExtractions";
import {getOpLog} from "../opLog/opLog";

export default async function(
    input: {
        [key: string]: {
            [key: string]: unknown
        }[] | {
            [key: string]: unknown
        }[]
    },
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
        extraction = normalizeExtraction(input);
    }
    if (!extraction || extraction.length === 0) {
        opLog.warn("printToConsole: nothing to print");
        opLog.warn("Learn more at https://ayakashi.io/docs/guide/builtin-saving-scripts.html");
        return;
    }
    if (typeof extraction[0] !== "object") {
        opLog.warn("printToConsole: invalid extraction format");
        opLog.warn("Learn more at https://ayakashi.io/docs/guide/builtin-saving-scripts.html");
        return;
    }
    const table = new Table();
    extraction.forEach(function(e) {
        Object.entries(e).forEach(function([key, val]) {
            if (typeof val === undefined || typeof val === null) {
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
