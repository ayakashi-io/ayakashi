import {getInstance} from "../engine/browser";
import {resolve as pathResolve} from "path";
import {PipeProc} from "pipeproc";
import {v4 as uuid} from "uuid";
import dayjs from "dayjs";
//@ts-ignore
import UserAgent from "user-agents";
import {getOpLog} from "../opLog/opLog";
import {cpus} from "os";

import {
    Config,
    ProcGenerator,
    firstPass,
    checkStepLevels,
    validateStepFormat,
    createProcGenerators,
    countSteps
} from "./parseConfig";

import {downloadChromium} from "../chromeDownloader/downloader";
import {isChromiumAlreadyInstalled, getChromePath} from "../store/chromium";
import {getManifest} from "../store/manifest";
import {getOrCreateStoreProjectFolder} from "../store/project";
// import debug from "debug";
// const d = debug("ayakashi:runner");

export async function run(projectFolder: string, config: Config, simpleScrapper?: string) {
    const opLog = getOpLog();
    let steps: (string | string[])[];
    let procGenerators: ProcGenerator[];
    const storeProjectFolder =
        await getOrCreateStoreProjectFolder(simpleScrapper ? `${projectFolder}/${simpleScrapper}` : projectFolder);
    try {
        steps = firstPass(config);
        checkStepLevels(steps);
        validateStepFormat(steps);
        procGenerators = createProcGenerators(config, steps, {
            bridgePort: (config.config && config.config.bridgePort) || 9731,
            protocolPort: (config.config && config.config.protocolPort) || 9730,
            projectFolder: projectFolder,
            storeProjectFolder: storeProjectFolder,
            operationId: uuid(),
            startDate: dayjs().format("YYYY-MM-DD-HH-mm-ss")
        });
    } catch (e) {
        opLog.error("Config Error -", e.message);
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
        const headlessChrome = await launch(config, projectFolder, chromePath);

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

        //launch pipeproc
        const stepCount = steps.length <= 4 ? 1 : countSteps(steps) - 3;
        const workers = stepCount > cpus().length ? cpus().length : stepCount;
        opLog.info(`using workers: ${workers}`);
        const pipeprocClient = PipeProc();
        await pipeprocClient.spawn({
            namespace: "ayakashi",
            memory: true,
            workers: workers
        });
        process.on("SIGINT", function() {
            pipeprocClient.shutdown();
        });

        //register the systemProcs and init the project
        //@ts-ignore
        await Promise.all(procs.map(proc => pipeprocClient.systemProc(proc)));
        await pipeprocClient.commit({
            topic: "init",
            body: {}
        });

        //close
        await pipeprocClient.waitForProcs();
        await headlessChrome.close();
        await pipeprocClient.shutdown();
    } catch (e) {
        opLog.error("Failed to run project");
        throw e;
    }
}

//tslint:disable cyclomatic-complexity
async function launch(config: Config, projectFolder: string, chromePath: string) {
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
    let protocolPort = 9730;
    if (config.config && config.config.protocolPort) {
        protocolPort = config.config.protocolPort;
    }
    let bridgePort = 9731;
    if (config.config && config.config.bridgePort) {
        bridgePort = config.config.bridgePort;
    }
    //spawn the chrome instance
    const headlessChrome = getInstance();
    await headlessChrome.init({
        headless: headless,
        chromePath: chromePath,
        autoOpenDevTools: autoOpenDevTools,
        bridgePort: bridgePort,
        protocolPort: protocolPort,
        sessionDir: persistentSession ? pathResolve(projectFolder, ".session") : undefined,
        proxyUrl: proxyUrl,
        windowHeight: windowHeight,
        windowWidth: windowWidth,
        userAgent: userAgent.toString(),
        ignoreCertificateErrors: ignoreCertificateErrors
    });

    return headlessChrome;
}
//tslint:enable cyclomatic-complexity
