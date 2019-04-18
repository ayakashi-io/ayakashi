import yargs from "yargs";
import {run} from "../runner/runner";
import {getOpLog} from "../opLog/opLog";
import {
    downloadLatestChromium,
    cleanChromiumDirectory,
    isChromiumAlreadyInstalled
} from "../chromeDownloader/downloader";
import {Config} from "../runner/parseConfig";
import {getDirectory} from "./getDirectory";
import {prepareStandard} from "./prepareStandard";
import {prepareSimple} from "./prepareSimple";
import {getName} from "./scaffold/getName";
import {generateProp} from "./scaffold/generateProp";
import {generateAction} from "./scaffold/generateAction";
import {generateExtractor} from "./scaffold/generateExtractor";
import {generatePreloader} from "./scaffold/generatePreloader";
import {generateScrapper} from "./scaffold/generateScrapper";
import {generateScript} from "./scaffold/generateScript";
import {generateProject} from "./scaffold/generateProject";
const packageJson = require("../../package.json");

yargs
    //@ts-ignore
    .command("run [dir]", "Runs a project", (_argv) => {
        yargs
            .positional("dir", {
                describe: "The root directory of a project or a scrapper file when --simple mode is used",
                default: "."
            })
            .option("configFile", {
                describe: "Use an alternative configFile",
                alias: "c",
                default: "ayakashi.config.js"
            })
            .option("simple", {
                type: "boolean",
                describe: "Run a single scrapper"
            })
            .option("out", {
                describe: "Select the saving format when --simple mode is used",
                default: "stdout",
                choices: ["sqlite", "csv", "json", "stdout"]
            })
            .epilogue("Learn more at https://ayakashi.io/docs/reference/cli-commands.html#run");
    }, async function(argv) {
        const opLog = getOpLog();
        opLog.info("Ayakashi version:", packageJson.version);
        let directory: string;
        let config: Config;
        if (argv.simple) {
            const simple = prepareSimple(<string>argv.dir, <string>argv.out);
            config = simple.config;
            directory = simple.directory;
        } else {
            const standard = prepareStandard(<string>argv.dir, <string>argv.configFile);
            config = standard.config;
            directory = standard.directory;
        }
        run(directory, config).then(function() {
            opLog.info("Nothing more to do!");
        }).catch(function(err) {
            opLog.error("Something went wrong", err);
            process.exit(1);
        });
    })
    //@ts-ignore
    .command("new [dir]", "Generates a new project", (_argv) => {
        yargs
            .positional("dir", {
                describe: "Where to place the generated files",
                default: "."
            })
            .option("project", {
                type: "boolean",
                describe: "Generate a new project"
            })
            .option("scrapper", {
                type: "boolean",
                describe: "Generate a new scrapper"
            })
            .option("script", {
                type: "boolean",
                describe: "Generate a new script"
            })
            .option("prop", {
                type: "boolean",
                describe: "Generate a new prop"
            })
            .option("action", {
                type: "boolean",
                describe: "Generate a new action"
            })
            .option("extractor", {
                type: "boolean",
                describe: "Generate a new extractor"
            })
            .option("preloader", {
                type: "boolean",
                describe: "Generate a new preloader"
            })
            .option("name", {
                type: "string",
                describe: "The name of the new scrapper|script|prop|action|extractor|preloader"
            })
            .epilogue("Learn more at https://ayakashi.io/docs/reference/cli-commands.html#new");
        //@ts-ignore
    }, async function(argv) {
        //tslint:disable cyclomatic-complexity
        const opLog = getOpLog();
        if ((!argv.prop && !argv.project && !argv.action && !argv.extractor &&
            !argv.preloader && !argv.scrapper && !argv.script) || argv.project) {
            if (argv.dir === ".") {
                await generateProject(getDirectory(argv.dir), true);
            } else {
                await generateProject(getDirectory(argv.dir, false), false);
            }
        } else if (argv.prop) {
            const name = await getName(argv.name, "prop");
            if (!name) {
                opLog.error("Invalid prop name");
                process.exit(1);
            }
            await generateProp(getDirectory(argv.dir), name);
        } else if (argv.action) {
            const name = await getName(argv.name, "action");
            if (!name) {
                opLog.error("Invalid action name");
                process.exit(1);
            }
            await generateAction(getDirectory(argv.dir), name);
        } else if (argv.extractor) {
            const name = await getName(argv.name, "extractor");
            if (!name) {
                opLog.error("Invalid extractor name");
                process.exit(1);
            }
            await generateExtractor(getDirectory(argv.dir), name);
        } else if (argv.preloader) {
            const name = await getName(argv.name, "preloader");
            if (!name) {
                opLog.error("Invalid preloader name");
                process.exit(1);
            }
            await generatePreloader(getDirectory(argv.dir), name);
        } else if (argv.scrapper) {
            const name = await getName(argv.name, "scrapper");
            if (!name) {
                opLog.error("Invalid scrapper name");
                process.exit(1);
            }
            await generateScrapper(getDirectory(argv.dir), name);
        } else if (argv.script) {
            const name = await getName(argv.name, "script");
            if (!name) {
                opLog.error("Invalid script name");
                process.exit(1);
            }
            await generateScript(getDirectory(argv.dir), name);
        }
    })
    //@ts-ignore
    .command("update-chrome [dir]", "Updates/Downloads the latest chromium revision", (_argv) => {
        yargs
            .positional("dir", {
                describe: "The root directory of the project",
                default: "."
            })
            .epilogue("Learn more at https://ayakashi.io/docs/reference/cli-commands.html#update-chrome");
        //@ts-ignore
    }, async function(argv) {
        const directory = getDirectory(<string>argv.dir);
        await cleanChromiumDirectory(directory);
        await downloadLatestChromium(directory);
    })
    //@ts-ignore
    .command("get-chrome [dir]", "Downloads the latest chromium revision if one is not already installed", (_argv) => {
        yargs
            .positional("dir", {
                describe: "The root directory of the project",
                default: "."
            })
            .epilogue("Learn more at https://ayakashi.io/docs/reference/cli-commands.html#get-chrome");
        //@ts-ignore
    }, async function(argv) {
        const directory = getDirectory(<string>argv.dir);
        const opLog = getOpLog();
        if (isChromiumAlreadyInstalled(directory)) {
            opLog.info("chromium already installed in .chromium, use update-chrome to update");
        } else {
            await cleanChromiumDirectory(directory);
            await downloadLatestChromium(directory);
        }
    })
    .demandCommand().recommendCommands().strict()
    .epilogue("Learn more at https://ayakashi.io/docs/reference/cli-commands.html")
    .argv;
