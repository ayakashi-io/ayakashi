import {IAyakashiInstance} from "../prelude/prelude";
import {IRenderlessAyakashiInstance} from "../prelude/renderlessPrelude";
import {IConnection} from "../engine/createConnection";
import {resolve as pathResolve} from "path";
//@ts-ignore
import requireAll from "require-all";
import dir from "node-dir";
import {existsSync} from "fs";
import {getOpLog} from "../opLog/opLog";
import {compile} from "../preloaderCompiler/compiler";
import debug from "debug";
const d = debug("ayakashi:loaders");

declare module "node-dir" {
    export function promiseFiles(dir: string): Promise<string[]>;
}

export function loadLocalProps(
    ayakashiInstance: IAyakashiInstance | IRenderlessAyakashiInstance,
    projectFolder: string
) {
    const opLog = getOpLog();
    const localPropsDir = pathResolve(projectFolder, "props");
    if (existsSync(localPropsDir)) {
        const props = requireAll(localPropsDir);
        Object.keys(props).forEach(function(propName) {
            try {
                if (typeof props[propName] !== "function" && props[propName].default) {
                    props[propName] = props[propName].default;
                }
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
}

export function loadLocalActions(ayakashiInstance: IAyakashiInstance, projectFolder: string) {
    const opLog = getOpLog();
    const localActionsDir = pathResolve(projectFolder, "actions");
    if (existsSync(localActionsDir)) {
        const actions = requireAll(localActionsDir);
        Object.keys(actions).forEach(function(actionName) {
            try {
                if (typeof actions[actionName] !== "function" && actions[actionName].default) {
                    actions[actionName] = actions[actionName].default;
                }
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
}

export function loadLocalExtractors(
    ayakashiInstance: IAyakashiInstance | IRenderlessAyakashiInstance,
    projectFolder: string
) {
    const opLog = getOpLog();
    const localExtractorsDir = pathResolve(projectFolder, "extractors");
    if (existsSync(localExtractorsDir)) {
        const extractors = requireAll(localExtractorsDir);
        Object.keys(extractors).forEach(function(extractor) {
            try {
                if (typeof extractors[extractor] !== "function" && extractors[extractor].default) {
                    extractors[extractor] = extractors[extractor].default;
                }
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
}

export async function loadLocalPreloaders(connection: IConnection, projectFolder: string, storeProjectFolder: string) {
    const localPreloadersDir = pathResolve(projectFolder, "preloaders");
    if (existsSync(localPreloadersDir)) {
        const localPreloaders: string[] = await dir.promiseFiles(localPreloadersDir);
        const localPreloaderDefinitions = localPreloaders.map(function(preloader: string) {
            return {
                module: preloader,
                as: null,
                waitForDOM: false
            };
        });
        await loadPreloaders(
            connection,
            localPreloaderDefinitions,
            projectFolder,
            storeProjectFolder
        );
    }
}

export function loadExternalActions(ayakashiInstance: IAyakashiInstance, actions?: string[]) {
    const opLog = getOpLog();
    if (actions && Array.isArray(actions)) {
        actions.forEach(function(actionModule) {
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
}

export function loadExternalExtractors(
    ayakashiInstance: IAyakashiInstance | IRenderlessAyakashiInstance,
    extractors?: string[]
) {
    const opLog = getOpLog();
    if (extractors && Array.isArray(extractors)) {
        extractors.forEach(function(extractorModule) {
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

export async function loadExternalPreloaders(
    connection: IConnection,
    projectFolder: string,
    storeProjectFolder: string,
    preloaders?: string[] | {
        module: string,
        as?: string,
        waitForDom?: boolean
    }[]
) {
    if (preloaders && Array.isArray(preloaders)) {
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
        await loadPreloaders(connection, preloaderDefinitions, projectFolder, storeProjectFolder);
    }
}

async function loadPreloaders(
    connection: IConnection,
    preloaderDefinitions: {
        module: string,
        as: string | null,
        waitForDOM: boolean
    }[],
    projectFolder: string,
    storeProjectFolder: string
) {
    const opLog = getOpLog();
    const preloaders = await Promise.all(preloaderDefinitions.map(function(preloaderDefinition) {
        return new Promise(function(resolve, reject) {
            compile(
                projectFolder,
                preloaderDefinition.module,
                "ayakashi",
                `${storeProjectFolder}/.cache/preloaders/`
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
