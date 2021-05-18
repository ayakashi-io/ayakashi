import {IAyakashiInstance} from "../prelude/prelude";
import {IRenderlessAyakashiInstance} from "../prelude/renderlessPrelude";
import {IConnection} from "../engine/createConnection";
import {resolve as pathResolve} from "path";
//@ts-ignore
import requireAll from "require-all";
import resolveFrom from "resolve-from";
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
        const props = requireAll({
            dirname: localPropsDir,
            filter: function(fileName: string) {
                if (fileName.includes(".js") && !fileName.includes(".map")) {
                    return fileName;
                } else {
                    return false;
                }
            }
        });
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
        const actions = requireAll({
            dirname: localActionsDir,
            filter: function(fileName: string) {
                if (fileName.includes(".js") && !fileName.includes(".map")) {
                    return fileName;
                } else {
                    return false;
                }
            }
        });
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
        const extractors = requireAll({
            dirname: localExtractorsDir,
            filter: function(fileName: string) {
                if (fileName.includes(".js") && !fileName.includes(".map")) {
                    return fileName;
                } else {
                    return false;
                }
            }
        });
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
        const localPreloaderDefinitions = localPreloaders
        .filter(function(preloader) {
            return preloader.includes(".js") && !preloader.includes(".map");
        })
        .map(function(preloader) {
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
            storeProjectFolder,
            //for local preloader we use the fileName as its name
            true
        );
    }
}

export function loadExternalActions(
    ayakashiInstance: IAyakashiInstance,
    projectFolder: string,
    actions?: string[]
) {
    const opLog = getOpLog();
    if (actions && Array.isArray(actions)) {
        actions.forEach(function(actionModule) {
            try {
                let action = require(resolveFrom(projectFolder, actionModule));
                if (typeof action !== "function" && action.default) {
                    action = action.default;
                }
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
    projectFolder: string,
    extractors?: string[]
) {
    const opLog = getOpLog();
    if (extractors && Array.isArray(extractors)) {
        extractors.forEach(function(extractorModule) {
            try {
                let extractor = require(resolveFrom(projectFolder, extractorModule));
                if (typeof extractor !== "function" && extractor.default) {
                    extractor = extractor.default;
                }
                if (typeof extractor === "function") {
                    d(`loading external extractor: ${extractorModule}`);
                    extractor(ayakashiInstance);
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
        //@ts-ignore
        const preloaderDefinitions: {
            module: string,
            as: string | null,
            waitForDOM: boolean
        //@ts-ignore
        }[] = preloaders.map(function(preloader) {
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
        await loadPreloaders(
            connection,
            preloaderDefinitions,
            projectFolder,
            storeProjectFolder,
            //for external preloaders we don't use the fileName as its name
            //we use the name provided
            false
        );
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
    storeProjectFolder: string,
    useFileName: boolean
) {
    const opLog = getOpLog();
    const preloaders = await Promise.all(preloaderDefinitions.map(function(preloaderDefinition) {
        return new Promise(function(resolve, reject) {
            compile(
                projectFolder,
                preloaderDefinition.module,
                "ayakashi",
                `${storeProjectFolder}/.cache/preloaders/`,
                useFileName
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
