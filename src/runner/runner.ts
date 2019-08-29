import {getInstance} from "../engine/browser";
import {resolve as pathResolve} from "path";
import {PipeProc} from "pipeproc";
import {v4 as uuid} from "uuid";
import dayjs from "dayjs";
//@ts-ignore
import UserAgent from "user-agents";
import {getOpLog} from "../opLog/opLog";
import {cpus} from "os";
import {existsSync} from "fs";

import {
    Config,
    ProcGenerator,
    firstPass,
    checkStepLevels,
    validateStepFormat,
    createProcGenerators,
    countSteps,
    isUsingNormalScraper,
    hasTypo
} from "./parseConfig";

import {downloadChromium} from "../chromeDownloader/downloader";
import {isChromiumAlreadyInstalled, getChromePath} from "../store/chromium";
import {getManifest} from "../store/manifest";
import {
    getOrCreateStoreProjectFolder,
    hasPreviousRun,
    clearPreviousRun,
    getPipeprocFolder,
    saveLastConfig,
    configChanged
} from "../store/project";
import {getRandomPort} from "./getRandomPort";
import debug from "debug";
const d = debug("ayakashi:runner");

export async function run(projectFolder: string, config: Config, options: {
    resume: boolean,
    restartDisabledSteps: boolean,
    clean: boolean,
    simpleScraper: string | null,
    sessionKey: string
}) {
    const opLog = getOpLog();
    let steps: (string | string[])[];
    let procGenerators: ProcGenerator[];
    let initializers: string[];
    const pipeprocClient = PipeProc();
    let headlessChrome = null;
    const storeProjectFolder =
        await getOrCreateStoreProjectFolder(options.simpleScraper ? `${projectFolder}/${options.simpleScraper}` : projectFolder, options.sessionKey);
    try {
        steps = firstPass(config);
        checkStepLevels(steps);
        validateStepFormat(steps);
        if (hasTypo(steps, config)) {
            opLog.error("The configuration still uses one of scrapper/renderlessScrapper/apiScrapper.");
            opLog.error("This was a typo and has been deprecated.");
            opLog.error("Please use scraper/renderlessScraper/apiScraper (with a single 'p') instead.");
            throw new Error("Deprecated configuration option");
        }
        if (!options.simpleScraper && existsSync(pathResolve(projectFolder, "scrappers")) &&
            !existsSync(pathResolve(projectFolder, "scrapers"))) {
                opLog.error("This project still uses a 'scrappers' folder.");
                opLog.error("This was a typo and has been deprecated.");
                opLog.error("Please move all your scraper files to a 'scrapers' folder (with a single 'p').");
                throw new Error("Deprecated folder structure");
        }
        config.config = config.config || {};
        if (config.config.bridgePort === 0) {
            config.config.bridgePort = await getRandomPort();
        } else if (!config.config.bridgePort) {
            config.config.bridgePort = 9731;
        }
        if (config.config.protocolPort === 0) {
            config.config.protocolPort = await getRandomPort();
        } else if (!config.config.protocolPort) {
            config.config.protocolPort = 9730;
        }
        const parsedConfig = createProcGenerators(config, steps, {
            bridgePort: config.config.bridgePort,
            protocolPort: config.config.protocolPort,
            persistentSession: (config.config && config.config.persistentSession === true) || false,
            projectFolder: projectFolder,
            storeProjectFolder: storeProjectFolder,
            operationId: uuid(),
            startDate: dayjs().format("YYYY-MM-DD-HH-mm-ss")
        });
        procGenerators = parsedConfig.procGenerators;
        initializers = parsedConfig.initializers;
    } catch (e) {
        throw e;
    }

    let chromePath: string;
    if (config.config && config.config.chromePath) {
        chromePath = config.config.chromePath;
    } else {
        if (!(await isChromiumAlreadyInstalled())) {
            const manifest = await getManifest();
            await downloadChromium(manifest.chromium.revision);
        }
        chromePath = await getChromePath();
    }
    try {
        //launch chrome
        if (isUsingNormalScraper(steps, config)) {
            d("using normal scraper(s), chrome will be spawned");
            headlessChrome = await launch(config, storeProjectFolder, chromePath);
        } else {
            d("using renderless scraper(s) only, chrome will not be spawned");
        }

        //finalize systemProcs
        const procs = procGenerators.map(function(generator) {
            return {
                name: generator.name,
                offset: ">",
                maxReclaims: generator.config.retries || 1,
                reclaimTimeout: -1,
                onMaxReclaimsReached: "disable",
                from: generator.from,
                to: generator.to,
                processor: generator.processor
            };
        });

        if (options.resume && options.clean) {
            opLog.error("Cannot use both --resume and --clean");
            throw new Error("Invalid run parameters");
        }
        const hasPrevious = await hasPreviousRun(storeProjectFolder);
        if (!options.resume && options.clean && hasPrevious) {
            opLog.info("cleaning previous run");
            await clearPreviousRun(storeProjectFolder);
            //re-create the project folder after clean
            await getOrCreateStoreProjectFolder(options.simpleScraper ? `${projectFolder}/${options.simpleScraper}` : projectFolder, options.sessionKey);
        } else if (!options.resume && !options.clean && hasPrevious) {
            opLog.error("Cannot start a new run while a previous unfinished run exists.");
            opLog.error("Use --resume to resume the previous run or --clean to clear it and start a new one.");
            throw new Error("Invalid run parameters");
        } else if (options.resume && hasPrevious) {
            if (await configChanged(config, storeProjectFolder)) {
                opLog.error("Cannot resume a project if its config has changed");
                opLog.error("Either revert your config to its previous state or use --clean to start a new run");
                throw new Error("Config modified");
            }
        }

        //launch pipeproc
        const stepCount = steps.length <= 4 ? 1 : countSteps(steps) - 3;
        const workers = stepCount > cpus().length ? cpus().length : stepCount;
        opLog.info(`using workers: ${workers}`);
        const waiter = opLog.waiter("initializing");
        await pipeprocClient.spawn({
            socket: `ipc://${pathResolve(storeProjectFolder, "run.sock")}`,
            location: getPipeprocFolder(storeProjectFolder),
            workers: workers,
            workerRestartAfter: 100
        });
        const SIGINT = "SIGINT";
        async function sigintListener() {
            d("trap SIGINT, closing pipeproc");
            await pipeprocClient.shutdown();
            process.removeListener(SIGINT, sigintListener);
        }
        process.on(SIGINT, sigintListener);

        if (options.resume && hasPrevious) {
            opLog.info("resuming previous run");
            await Promise.all(procs.map(async function(proc) {
                try {
                    await pipeprocClient.reclaimProc(proc.name);
                } catch (_e) {}
                if (options.restartDisabledSteps) {
                    try {
                        await pipeprocClient.resumeProc(proc.name);
                    } catch (_e) {}
                }
            }));
        } else {
            await saveLastConfig(config, storeProjectFolder);
            //register the systemProcs and init the project
            //@ts-ignore
            await Promise.all(procs.map(proc => pipeprocClient.systemProc(proc)));
            await pipeprocClient.commit(initializers.map(init => {
                return {
                    topic: init,
                    body: {}
                };
            }));
        }
        waiter.succeed("running");

        //close
        await pipeprocClient.waitForProcs();
        let procWithError = false;
        for (const pr of procs) {
            const proc = await pipeprocClient.inspectProc(pr.name);
            if (proc.status === "disabled") {
                procWithError = true;
            }
        }
        if (headlessChrome) {
            await headlessChrome.close();
        }
        await pipeprocClient.shutdown();
        if (!procWithError) {
            opLog.info("cleaning run state");
            await clearPreviousRun(storeProjectFolder);
        } else {
            opLog.warn("Run finished but some steps were disabled due to errors, run state will not be cleared");
            opLog.warn("You can try re-running them by passing --resume and --restartDisabledSteps");
        }
    } catch (e) {
        try {
            await pipeprocClient.shutdown();
        } catch (_e) {
            d(_e);
        }
        try {
            if (headlessChrome) {
                await headlessChrome.close();
            }
        } catch (_e) {
            d(_e);
        }
        opLog.error("Failed to run project");
        throw e;
    }
}

//tslint:disable cyclomatic-complexity
async function launch(config: Config, storeProjectFolder: string, chromePath: string) {
    //check top level config options
    let headless = true;
    if (config.config && config.config.headless === false) {
        headless = false;
    }
    let autoOpenDevTools = true;
    if (config.config && config.config.openDevTools === false) {
        autoOpenDevTools = false;
    }
    let persistentSession = false;
    if (config.config && config.config.persistentSession === true) {
        persistentSession = true;
    }
    let ignoreCertificateErrors = false;
    if (config.config && config.config.ignoreCertificateErrors === true) {
        ignoreCertificateErrors = true;
    }
    let proxyUrl;
    if (config.config && config.config.proxyUrl) {
        proxyUrl = config.config.proxyUrl;
    }
    let windowHeight;
    if (config.config && config.config.windowHeight) {
        windowHeight = config.config.windowHeight;
    }
    let windowWidth;
    if (config.config && config.config.windowWidth) {
        windowWidth = config.config.windowWidth;
    }
    let userAgent = "";
    if (!config.config || (config.config && (!config.config.userAgent || config.config.userAgent === "random"))) {
        userAgent = new UserAgent();
    }
    if (config.config && config.config.userAgent === "desktop") {
        userAgent = new UserAgent({deviceCategory: "desktop"});
    }
    if (config.config && config.config.userAgent === "mobile") {
        userAgent = new UserAgent({deviceCategory: "mobile"});
    }
    //spawn the chrome instance
    const headlessChrome = getInstance();
    await headlessChrome.init({
        headless: headless,
        chromePath: chromePath,
        autoOpenDevTools: autoOpenDevTools,
        bridgePort: <number>(config.config!).bridgePort,
        protocolPort: <number>(config.config!).protocolPort,
        sessionDir: persistentSession ? pathResolve(storeProjectFolder, ".session") : undefined,
        proxyUrl: proxyUrl,
        windowHeight: windowHeight,
        windowWidth: windowWidth,
        userAgent: userAgent.toString(),
        ignoreCertificateErrors: ignoreCertificateErrors
    });

    return headlessChrome;
}
//tslint:enable cyclomatic-complexity
