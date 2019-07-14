import yargs from "yargs";
import {run} from "../runner/runner";
import {getOpLog} from "../opLog/opLog";
import {downloadChromium} from "../chromeDownloader/downloader";
import {isChromiumAlreadyInstalled, cleanChromiumDirectory, getStoredRevision} from "../store/chromium";
import {getManifest} from "../store/manifest";
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
import {generateRenderlessScrapper} from "./scaffold/generateRenderlessScrapper";
import {generateApiScrapper} from "./scaffold/generateApiScrapper";
import {generateScript} from "./scaffold/generateScript";
import {generateProject} from "./scaffold/generateProject";
import {showBoxUpdate, showLineUpdate} from "./update/showUpdate";
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
            .option("resume", {
                type: "boolean",
                describe: "Resume execution of a previous unfinished run"
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
        await showLineUpdate();
        const resume = <boolean>argv.resume || false;
        let directory: string;
        let config: Config;
        let simpleScrapper = "";
        if (argv.simple) {
            const simple = prepareSimple(<string>argv.dir, <string>argv.out);
            config = simple.config;
            directory = simple.directory;
            simpleScrapper = simple.scrapper;
        } else {
            const standard = prepareStandard(<string>argv.dir, <string>argv.configFile);
            config = standard.config;
            directory = standard.directory;
        }
        run(directory, config, resume, simpleScrapper).then(async function() {
            opLog.info("Nothing more to do!");
            await showBoxUpdate();
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
            .option("renderlessScrapper", {
                type: "boolean",
                describe: "Generate a new renderlessScrapper"
            })
            .option("apiScrapper", {
                type: "boolean",
                describe: "Generate a new apiScrapper"
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
                describe: "The name of the new scrapper|renderlessScrapper|script|prop|action|extractor|preloader"
            })
            .epilogue("Learn more at https://ayakashi.io/docs/reference/cli-commands.html#new");
        //@ts-ignore
    }, async function(argv) {
        //tslint:disable cyclomatic-complexity
        const opLog = getOpLog();
        if ((!argv.prop && !argv.project && !argv.action && !argv.extractor &&
            !argv.preloader && !argv.scrapper && !argv.renderlessScrapper &&
            !argv.apiScrapper && !argv.script) || argv.project) {
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
        } else if (argv.renderlessScrapper) {
            const name = await getName(argv.name, "renderlessScrapper");
            if (!name) {
                opLog.error("Invalid renderlessScrapper name");
                process.exit(1);
            }
            await generateRenderlessScrapper(getDirectory(argv.dir), name);
        } else if (argv.apiScrapper) {
            const name = await getName(argv.name, "apiScrapper");
            if (!name) {
                opLog.error("Invalid apiScrapper name");
                process.exit(1);
            }
            await generateApiScrapper(getDirectory(argv.dir), name);
        }  else if (argv.script) {
            const name = await getName(argv.name, "script");
            if (!name) {
                opLog.error("Invalid script name");
                process.exit(1);
            }
            await generateScript(getDirectory(argv.dir), name);
        }

        await showBoxUpdate();
    })
    //@ts-ignore
    .command("update-chrome", "Updates/Downloads the latest chromium revision", (_argv) => {
        yargs
            .epilogue("Learn more at https://ayakashi.io/docs/reference/cli-commands.html#update-chrome");
        //@ts-ignore
    }, async function(argv) {
        const opLog = getOpLog();
        const storedRevision = await getStoredRevision();
        const manifest = await getManifest();
        if (storedRevision < manifest.chromium.revision || !(await isChromiumAlreadyInstalled())) {
            await cleanChromiumDirectory();
            await downloadChromium(manifest.chromium.revision);
        } else {
            opLog.info("Chromium is already at the latest recommended revision");
        }
    })
    //@ts-ignore
    .command("get-chrome", "Downloads the latest chromium revision if one is not already installed", (_argv) => {
        yargs
            .epilogue("Learn more at https://ayakashi.io/docs/reference/cli-commands.html#get-chrome");
        //@ts-ignore
    }, async function(argv) {
        const opLog = getOpLog();
        if (await isChromiumAlreadyInstalled()) {
            opLog.info("chromium is already installed, use update-chrome to update");
        } else {
            const manifest = await getManifest();
            await cleanChromiumDirectory();
            await downloadChromium(manifest.chromium.revision);
        }
    })
    //@ts-ignore
    .command("info", "System information", (_argv) => {
        //@ts-ignore
    }, async function(argv) {
        const opLog = getOpLog();
        const storedRevision = await getStoredRevision();
        opLog.info(`Ayakashi version: ${packageJson.version}`);
        if (await isChromiumAlreadyInstalled()) {
            opLog.info(`Chromium revision: ${storedRevision}`);
        } else {
            opLog.info(`Chromium revision: none`);
        }
        await showBoxUpdate();
    })
    .demandCommand().recommendCommands().strict()
    .epilogue("Learn more at https://ayakashi.io/docs/reference/cli-commands.html")
    .argv;
