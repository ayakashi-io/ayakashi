import {getOpLog} from "../opLog/opLog";
import {getDirectory} from "./getDirectory";
import {sep} from "path";
import {Config} from "../runner/parseConfig";

export function prepareSimple(file: string, out: string): {config: Config, directory: string, scrapper: string} {
    const opLog = getOpLog();
    if (file === ".") {
        opLog.error("Simple mode requires a scrapper file as input");
        return process.exit(1);
    }
    const splittedDir = file.split(sep);
    const scrapper = splittedDir.pop();
    const directory = getDirectory(splittedDir.join("/"));
    process.chdir(directory);
    opLog.info("running scrapper in simple mode");
    opLog.info("directory:", directory);
    opLog.info("scrapper:", <string>scrapper);
    let saveFile: string;
    let saveScript: string;
    if (out === "sqlite") {
        saveFile = "data.sqlite";
        saveScript = "saveToSQL";
        opLog.info("data will be saved to a sqlite database");
    } else if (out === "csv") {
        saveFile = "data.csv";
        saveScript = "saveToCSV";
        opLog.info("data will be saved to a csv file");
    } else if (out === "json") {
        saveFile = "data.json";
        saveScript = "saveToJSON";
        opLog.info("data will be saved to a json file");
    } else {
        saveFile = "";
        saveScript = "printToConsole";
        opLog.info("data will be printed to console, specify --out=sqlite|json|csv to change the format");
    }
    return {
        config: {
            waterfall: [{
                type: "scrapper",
                module: <string>scrapper,
                config: {
                    localAutoLoad: false,
                    simple: true
                }
            }, {
                type: "script",
                module: saveScript,
                params: {
                    file: saveFile,
                    database: saveFile
                }
            }]
        },
        directory: directory,
        scrapper: <string>scrapper
    };
}
