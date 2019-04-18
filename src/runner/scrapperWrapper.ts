import request from "request-promise-native";
import {createConnection, EmulatorOptions, IConnection} from "../engine/createConnection";
import {ICDPTab} from "../engine/createTarget";
import {prelude, IAyakashiInstance} from "../prelude/prelude";
//@ts-ignore
import requireAll from "require-all";
import {resolve as pathResolve} from "path";
import {PipeProc} from "pipeproc";
import {compile} from "../preloaderCompiler/compiler";
import dir from "node-dir";
import {existsSync} from "fs";
import {getOpLog} from "../opLog/opLog";
import {consoleWrap} from "./consoleWrap";
import debug from "debug";
const d = debug("ayakashi:scrapperWrapper");

declare module "../prelude/prelude" {
    export interface IAyakashiInstance {
/**
 * Yields extracted data from a scrapper to the next step of the pipeline.
 * Learn more about yield in this example: http://ayakashi.io/guide/building-a-complete-scraping-project.html
 * ```js
ayakashi.select("myDivProp").where({id: {eq: "myDiv"}});
const result = await ayakashi.extract("myDivProp");
await ayakashi.yield(result);
```
*/
        yield: (extracted: object | Promise<object>) => Promise<void>;
/**
 * Sugar method to yield multiple matches.
 * Learn more about yield in this example: http://ayakashi.io/guide/building-a-complete-scraping-project.html
 * ```js
await ayakashi.yieldEach(extractedLinks);
//is the same as
for (const link of extractedLinks) {
    await ayakashi.yield(extractedLinks);
}
```
*/
        yieldEach: (extracted: object[] | Promise<object[]>) => Promise<void>;
    }
}

declare module "node-dir" {
    export function promiseFiles(dir: string): Promise<string[]>;
}

type PassedLog = {
    id: string,
    body: {
        input: object,
        params: object,
        config: {
            pipeConsole?: boolean,
            pipeExceptions?: boolean,
            localAutoLoad?: boolean,
            emulatorOptions?: EmulatorOptions,
            simple?: boolean
        },
        load: {
            extractors?: string[],
            actions?: string[],
            preloaders?: string[] | {
                module: string,
                as?: string,
                waitForDom?: boolean
            }[]
        },
        module: string,
        connectionConfig: {
            bridgePort: number,
            protocolPort: number
        },
        saveTopic: string,
        projectFolder: string,
        operationId: string,
        startDate: string,
        procName: string,
        appRoot: string
    }
};

export default async function scrapperWrapper(log: PassedLog) {
    try {
        const opLog = getOpLog();
        opLog.info("running scrapper", log.body.module);
        //get a tab and create a connection
        const tab = await getTarget(log.body.connectionConfig.bridgePort);
        if (!tab) {
            opLog.error("Could not create a connection");
            throw new Error("no_target");
        }
        const connection = await createConnection(
            tab,
            log.body.connectionConfig.bridgePort,
            log.body.config.emulatorOptions
        );
        if (!connection) {
            opLog.error("Could not create a connection");
            throw new Error("no_connection");
        }

        //check pipes and initialize the instance using the prelude
        if (log.body.config.pipeConsole !== false) {
            connection.pipe.console(function(text) {
                if (text && text.indexOf("[Ayakashi]") === -1) {
                    opLog.debug(`<Scrapper:${log.body.module}:Browser>`, text);
                }
            });
        }
        if (log.body.config.pipeExceptions !== false) {
            connection.pipe.uncaughtException(function(exception) {
                opLog.debug(`<Scrapper:${log.body.module}:Browser:Exception>`, JSON.stringify(exception, null, 2));
            });
        }
        const ayakashiInstance = await prelude(connection);

        //connect to pipeproc
        const pipeprocClient = PipeProc();
        await pipeprocClient.connect({namespace: "ayakashi"});

        //define the .yield() method
        let yieldedAtLeastOnce = false;
        ayakashiInstance.yield = async function(extracted) {
            if (extracted instanceof Promise) {
                const actualExtracted = await extracted;
                if (!actualExtracted || typeof actualExtracted !== "object") return;
                await pipeprocClient.commit({
                    topic: log.body.saveTopic,
                    body: actualExtracted
                });
                yieldedAtLeastOnce = true;
            } else {
                if (!extracted || typeof extracted !== "object") return;
                await pipeprocClient.commit({
                    topic: log.body.saveTopic,
                    body: extracted
                });
                yieldedAtLeastOnce = true;
            }
        };
        ayakashiInstance.yieldEach = async function(extracted) {
            if (extracted instanceof Promise) {
                const actualExtracted = await extracted;
                if (!Array.isArray(actualExtracted) || actualExtracted.length === 0) {
                    opLog.warn("<yieldEach> requires an array");
                    return;
                }
                await Promise.all(actualExtracted.map(ex => {
                    return ayakashiInstance.yield(ex);
                }));
            } else {
                if (!Array.isArray(extracted) || extracted.length === 0) {
                    opLog.warn("<yieldEach> requires an array");
                    return;
                }
                await Promise.all(extracted.map(ex => {
                    return ayakashiInstance.yield(ex);
                }));
            }
        };

        //load domQL as a preloader
        const domqlPreloader = await compile(
            log.body.appRoot,
            `./lib/domQL/domQL`,
            "ayakashi",
            `${log.body.projectFolder}/.cache/preloaders/`
        );
        await connection.injectPreloader({compiled: domqlPreloader, as: "domQL", waitForDOM: false});

        //load findCssSelector as a preloader
        const findCssSelectorPreloader = await compile(
            log.body.appRoot,
            `@ayakashi/get-node-selector`,
            "ayakashi",
            `${log.body.projectFolder}/.cache/preloaders/`
        );
        await connection.injectPreloader({
            compiled: findCssSelectorPreloader,
            as: "getNodeSelector",
            waitForDOM: false
        });
        //load detection patches
        const detectionPatches = await compile(
            log.body.appRoot,
            "./lib/detection/patch",
            "ayakashi",
            `${log.body.projectFolder}/.cache/preloaders/`
        );
        await connection.injectPreloader({
            compiled: detectionPatches,
            as: "detectionPatches",
            waitForDOM: false
        });

        //load external actions/extractors/preloaders
        await loadExternals(connection, ayakashiInstance, log);

        //autoLoad local actions/extractors/preloaders
        if (log.body.config.localAutoLoad !== false) {
            await loadLocals(connection, ayakashiInstance, log);
        }

        //activate the connection and load the scrapper
        await connection.activate();
        let scrapperModule;
        try {
            if (log.body.config.simple) {
                scrapperModule = require(pathResolve(log.body.projectFolder, log.body.module));
            } else {
                scrapperModule = require(pathResolve(log.body.projectFolder, "scrappers", log.body.module));
            }
            if (typeof scrapperModule !== "function") {
                scrapperModule = scrapperModule.default;
            }
            if (typeof scrapperModule !== "function") {
                throw new Error(`Scrapper <${log.body.module}> is not a function`);
            }
        } catch (e) {
            opLog.error(e.message);
            await connection.release();
            throw e;
        }
        consoleWrap("Scrapper", log.body.module);
        //run the scrapper
        let result;
        try {
            result = await scrapperModule(ayakashiInstance, log.body.input || {}, log.body.params || {});
        } catch (e) {
            opLog.error(`There was an error while running scrapper <${log.body.module}> -`, e.message, e.stack);
            await connection.release();
            throw e;
        }
        if (result) {
            await ayakashiInstance.yield(result);
        }
        if (!result && !yieldedAtLeastOnce) {
            await ayakashiInstance.yield({});
        }
        await connection.release();
    } catch (e) {
        throw e;
    }
}

async function getTarget(port: number): Promise<ICDPTab | null> {
    let tab;
    tab = await getAvailableTarget(port);
    if (tab) {
        return tab;
    } else {
        tab = await createTarget(port);
    }
    if (tab) {
        return tab;
    } else {
        await collectDeadTargets(port);
        tab = await createTarget(port);
    }
    if (tab) {
        return tab;
    } else {
        return null;
    }
}

async function getAvailableTarget(port: number): Promise<ICDPTab | null> {
    const resp = await request.post(`http://localhost:${port}/get_available_target`);
    if (resp) {
        const parsedResp = JSON.parse(resp);
        if (parsedResp.ok) {
            return parsedResp.tab;
        } else {
            return null;
        }
    } else {
        return null;
    }
}

async function createTarget(port: number): Promise<ICDPTab | null> {
    const resp = await request.post(`http://localhost:${port}/create_target`);
    if (resp) {
        const parsedResp = JSON.parse(resp);
        if (parsedResp.ok) {
            return parsedResp.tab;
        } else {
            return null;
        }
    } else {
        return null;
    }
}

async function collectDeadTargets(port: number): Promise<ICDPTab | null> {
    return request.post(`http://localhost:${port}/collect_dead_targets`);
}

async function loadPreloaders(
    connection: IConnection,
    preloaderDefinitions: {
        module: string,
        as: string | null,
        waitForDOM: boolean
    }[],
    projectFolder: string
) {
    const opLog = getOpLog();
    const preloaders = await Promise.all(preloaderDefinitions.map(function(preloaderDefinition) {
        return new Promise(function(resolve, reject) {
            compile(
                projectFolder,
                preloaderDefinition.module,
                "ayakashi",
                `${projectFolder}/.cache/preloaders/`
            ).then(function(compiled) {
                resolve({
                    compiled: compiled,
                    as: preloaderDefinition.as,
                    waitForDOM: preloaderDefinition.waitForDOM
                });
            }).catch(function(err) {
                opLog.error(`Failed to compile preloader ${preloaderDefinition.module}`);
                reject(err);
            });
        });
    }));
    return Promise.all(preloaders.map(async function(preloader) {
        try {
            //@ts-ignore
            await connection.injectPreloader(preloader);
        } catch (e) {
            //@ts-ignore
            opLog.error(`Failed to load preloader ${preloader.module}`);
            throw e;
        }
    }));
}

async function loadExternals(
    connection: IConnection,
    ayakashiInstance: IAyakashiInstance,
    log: PassedLog
) {
    const opLog = getOpLog();
    //load external preloaders
    if (log.body.load.preloaders && Array.isArray(log.body.load.preloaders)) {
        const preloaderDefinitions: {
            module: string,
            as: string | null,
            waitForDOM: boolean
            //@ts-ignore
        }[] = log.body.load.preloaders.map(function(preloader) {
            if (typeof preloader === "string") {
                return {
                    module: preloader,
                    as: null,
                    waitForDOM: false
                };
            } else if (typeof preloader === "object" && typeof preloader.module === "string") {
                return {
                    module: preloader.module,
                    as: preloader.as || null,
                    waitForDOM: preloader.waitForDOM || null
                };
            } else {
                return null;
            }
            //@ts-ignore
        }).filter(preloader => !!preloader);
        await loadPreloaders(connection, preloaderDefinitions, log.body.projectFolder);
    }
    //load external actions
    if (log.body.load.actions && Array.isArray(log.body.load.actions)) {
        log.body.load.actions.forEach(function(actionModule) {
            try {
                const action = require(actionModule);
                if (typeof action === "function") {
                    d(`loading external action: ${actionModule}`);
                    action(ayakashiInstance);
                } else {
                    throw new Error("invalid_action");
                }
            } catch (e) {
                opLog.error(`Action <${actionModule}> is invalid`);
                throw e;
            }
        });
    }
    //load external extractors
    if (log.body.load.extractors && Array.isArray(log.body.load.extractors)) {
        log.body.load.extractors.forEach(function(extractorModule) {
            try {
                const registerExtractor = require(extractorModule);
                if (typeof extractorModule === "function") {
                    d(`loading external extractor: ${extractorModule}`);
                    registerExtractor(ayakashiInstance);
                } else {
                    throw new Error("invalid_extractor");
                }
            } catch (e) {
                opLog.error(`Extractor <${extractorModule}> is invalid`);
                throw e;
            }
        });
    }
}

async function loadLocals(
    connection: IConnection,
    ayakashiInstance: IAyakashiInstance,
    log: PassedLog
) {
    const opLog = getOpLog();
    //autoload local props
    const localPropsDir = pathResolve(log.body.projectFolder, "props");
    if (existsSync(localPropsDir)) {
        const props = requireAll(localPropsDir);
        Object.keys(props).forEach(function(propName) {
            try {
                if (typeof props[propName] === "function") {
                    d(`autoloading prop: ${propName}`);
                    props[propName](ayakashiInstance);
                } else {
                    throw new Error("invalid_prop");
                }
            } catch (e) {
                opLog.error(`Local prop <${propName}> is invalid`);
                throw e;
            }
        });
    }
    //autoload local actions
    const localActionsDir = pathResolve(log.body.projectFolder, "actions");
    if (existsSync(localActionsDir)) {
        const actions = requireAll(localActionsDir);
        Object.keys(actions).forEach(function(actionName) {
            try {
                if (typeof actions[actionName] === "function") {
                    d(`autoloading action: ${actionName}`);
                    actions[actionName](ayakashiInstance);
                } else {
                    throw new Error("invalid_action");
                }
            } catch (e) {
                opLog.error(`Local action <${actionName}> is invalid`);
                throw e;
            }
        });
    }
    // //autoload local extractors
    const localExtractorsDir = pathResolve(log.body.projectFolder, "extractors");
    if (existsSync(localExtractorsDir)) {
        const extractors = requireAll(localExtractorsDir);
        Object.keys(extractors).forEach(function(extractor) {
            try {
                if (typeof extractors[extractor] === "function") {
                    d(`autoloading extractor: ${extractor}`);
                    extractors[extractor](ayakashiInstance);
                } else {
                    throw new Error("invalid_extractor");
                }
            } catch (e) {
                opLog.error(`Local extractor <${extractor}> is invalid`);
                throw e;
            }
        });
    }
    // //autoload local preloaders
    const localPreloadersDir = pathResolve(log.body.projectFolder, "preloaders");
    if (existsSync(localPreloadersDir)) {
        const localPreloaders: string[] = await dir.promiseFiles(localPreloadersDir);
        const localPreloaderDefinitions = localPreloaders.map(function(preloader: string) {
            return {
                module: preloader,
                as: null,
                waitForDOM: false
            };
        });
        await loadPreloaders(connection, localPreloaderDefinitions, log.body.projectFolder);
    }
}
