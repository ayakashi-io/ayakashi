import yargs from "yargs";
import {run} from "../runner/runner";
import {getOpLog} from "../opLog/opLog";
import {downloadChromium, getRecommendedChromiumRevision} from "../chromeDownloader/downloader";
import {isChromiumAlreadyInstalled, getStoredRevision} from "../store/chromium";
import {Config} from "../runner/parseConfig";
import {getDirectory} from "./getDirectory";
import {prepareStandard} from "./prepareStandard";
import {prepareSimple} from "./prepareSimple";
import {prepareFromJson} from "./prepareFromJson";
import {getName} from "./scaffold/getName";
import {generateProp} from "./scaffold/generateProp";
import {generateAction} from "./scaffold/generateAction";
import {generateExtractor} from "./scaffold/generateExtractor";
import {generatePreloader} from "./scaffold/generatePreloader";
import {generateScraper} from "./scaffold/generateScraper";
import {generateRenderlessScraper} from "./scaffold/generateRenderlessScraper";
import {generateApiScraper} from "./scaffold/generateApiScraper";
import {generateScript} from "./scaffold/generateScript";
import {generateProject} from "./scaffold/generateProject";
import {refreshUA} from "./refreshUA";
import {updateStealthPatches} from "./updateStealth";
const packageJson = require("../../package.json");

yargs
    //@ts-ignore
    .command("run [dir]", "Runs a project", (_argv) => {
        yargs
            .positional("dir", {
                describe: "The root directory of a project or a scraper file when --simple mode is used",
                default: "."
            })
            .option("configFile", {
                describe: "Use an alternative configFile",
                alias: "c",
                default: ""
            })
            .option("jsonConfig", {
                describe: "Use a json string as config",
                alias: "jc"
            })
            .option("sessionKey", {
                describe: "Use a specific run session",
                default: "default",
                coerce: function(v) {
                    return String(v);
                }
            })
            .option("simple", {
                type: "boolean",
                describe: "Run a single scraper"
            })
            .option("simpleRenderless", {
                type: "boolean",
                describe: "Run a single renderlessScraper"
            })
            .option("simpleApi", {
                type: "boolean",
                describe: "Run a single apiScraper"
            })
            .option("resume", {
                type: "boolean",
                describe: "Resume execution of a previous unfinished run"
            })
            .option("restartDisabledSteps", {
                type: "boolean",
                describe: "Will restart all steps that terminated due to an error. Only works when --resume is used"
            })
            .option("clean", {
                type: "boolean",
                describe: "Clear the previous run if it exists and start from the beginning"
            })
            .option("out", {
                describe: "Select the saving format when --simple mode is used",
                default: "stdout",
                choices: ["sqlite", "csv", "json", "stdout"]
            })
            .epilogue("Learn more at https://ayakashi-io.github.io/docs/reference/cli-commands.html#run");
    }, async function(argv) {
        const opLog = getOpLog();
        opLog.info("Ayakashi version:", packageJson.version);
        const resume = <boolean>argv.resume || false;
        const restartDisabledSteps = <boolean>argv.restartDisabledSteps || false;
        const clean = <boolean>argv.clean || false;
        let directory: string;
        let config: Config;
        let simpleScraper = null;
        if (argv.jsonConfig) {
            const fromJson = prepareFromJson(<string>argv.dir, <string>argv.jsonConfig);
            config = fromJson.config;
            directory = fromJson.directory;
        } else {
            if (argv.simple) {
                const simple = prepareSimple(<string>argv.dir, <string>argv.out, "scraper");
                config = simple.config;
                directory = simple.directory;
                simpleScraper = simple.scraper;
            } else if (argv.simpleRenderless) {
                const simple = prepareSimple(<string>argv.dir, <string>argv.out, "renderlessScraper");
                config = simple.config;
                directory = simple.directory;
                simpleScraper = simple.scraper;
            } else if (argv.simpleApi) {
                const simple = prepareSimple(<string>argv.dir, <string>argv.out, "apiScraper");
                config = simple.config;
                directory = simple.directory;
                simpleScraper = simple.scraper;
            } else {
                const standard = prepareStandard(<string>argv.dir, <string>argv.configFile);
                config = standard.config;
                directory = standard.directory;
            }
        }
        run(directory, config, {
            resume: resume,
            restartDisabledSteps: restartDisabledSteps,
            clean: clean,
            simpleScraper: simpleScraper,
            sessionKey: <string>argv.sessionKey
        }).then(async function() {
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
            .option("scraper", {
                type: "boolean",
                describe: "Generate a new scraper"
            })
            .option("renderlessScraper", {
                type: "boolean",
                describe: "Generate a new renderlessScraper"
            })
            .option("apiScraper", {
                type: "boolean",
                describe: "Generate a new apiScraper"
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
                describe: "The name of the new scraper|renderlessScraper|script|prop|action|extractor|preloader"
            })
            .epilogue("Learn more at https://ayakashi-io.github.io/docs/reference/cli-commands.html#new");
        //@ts-ignore
    }, async function(argv) {
        //tslint:disable cyclomatic-complexity
        const opLog = getOpLog();
        if ((!argv.prop && !argv.project && !argv.action && !argv.extractor &&
            !argv.preloader && !argv.scraper && !argv.renderlessScraper &&
            !argv.apiScraper && !argv.script) || argv.project) {
            if (argv.dir === ".") {
                await generateProject(getDirectory(argv.dir), true);
            } else {
                await generateProject(getDirectory(<string>argv.dir, false), false);
            }
        } else if (argv.prop) {
            const name = await getName(argv.name, "prop");
            if (!name) {
                opLog.error("Invalid prop name");
                process.exit(1);
            }
            await generateProp(getDirectory(<string>argv.dir), name);
        } else if (argv.action) {
            const name = await getName(argv.name, "action");
            if (!name) {
                opLog.error("Invalid action name");
                process.exit(1);
            }
            await generateAction(getDirectory(<string>argv.dir), name);
        } else if (argv.extractor) {
            const name = await getName(argv.name, "extractor");
            if (!name) {
                opLog.error("Invalid extractor name");
                process.exit(1);
            }
            await generateExtractor(getDirectory(<string>argv.dir), name);
        } else if (argv.preloader) {
            const name = await getName(argv.name, "preloader");
            if (!name) {
                opLog.error("Invalid preloader name");
                process.exit(1);
            }
            await generatePreloader(getDirectory(<string>argv.dir), name);
        } else if (argv.scraper) {
            const name = await getName(argv.name, "scraper");
            if (!name) {
                opLog.error("Invalid scraper name");
                process.exit(1);
            }
            await generateScraper(getDirectory(<string>argv.dir), name);
        } else if (argv.renderlessScraper) {
            const name = await getName(argv.name, "renderlessScraper");
            if (!name) {
                opLog.error("Invalid renderlessScraper name");
                process.exit(1);
            }
            await generateRenderlessScraper(getDirectory(<string>argv.dir), name);
        } else if (argv.apiScraper) {
            const name = await getName(argv.name, "apiScraper");
            if (!name) {
                opLog.error("Invalid apiScraper name");
                process.exit(1);
            }
            await generateApiScraper(getDirectory(<string>argv.dir), name);
        }  else if (argv.script) {
            const name = await getName(argv.name, "script");
            if (!name) {
                opLog.error("Invalid script name");
                process.exit(1);
            }
            await generateScript(getDirectory(<string>argv.dir), name);
        }
    })
    //@ts-ignore
    .command("update-chrome", "Downloads the recommended, latest or specified chromium revision", (_argv) => {
        yargs
        .option("revision", {
            describe: "Download a specific revision",
            type: "number",
            alias: "r"
        })
        .option("latest", {
            describe: "Download the latest revision",
            type: "boolean"
        })
        .epilogue("Learn more at https://ayakashi-io.github.io/docs/reference/cli-commands.html#get-chrome");
        //@ts-ignore
    }, async function(argv) {
        const storedRevision = await getStoredRevision();
        let revision = 0;
        if (argv.revision) {
            revision = <number>argv.revision;
        } else if (argv.latest) {
            revision = 0;
        } else {
            revision = await getRecommendedChromiumRevision();
        }
        await downloadChromium(revision, storedRevision);
    })
    //@ts-ignore
    .command("update-ua", "Updates the builtin database of user agent strings", (_argv) => {
        yargs
        .epilogue("Learn more at TODO");
        //@ts-ignore
    }, async function(argv) {
        await refreshUA();
    })
    //@ts-ignore
    .command("update-stealth", "Updates the headless chromium stealth patches", (_argv) => {
        yargs
        .epilogue("Learn more at TODO");
        //@ts-ignore
    }, async function(argv) {
        await updateStealthPatches();
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
    })
    .demandCommand().recommendCommands().strict()
    .epilogue("Learn more at https://ayakashi-io.github.io/docs/reference/cli-commands.html")
    .argv;
