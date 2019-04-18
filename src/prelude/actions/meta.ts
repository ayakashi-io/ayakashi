import {IConnection} from "../../engine/createConnection";
import {IAyakashiInstance} from "../prelude";
import {createQuery} from "../query/query";
import {getOpLog} from "../../opLog/opLog";

import debug from "debug";
import {ExtractorFn} from "./extract";
const d = debug("ayakashi:prelude:meta");

export function attachMetaActions(ayakashiInstance: IAyakashiInstance, connection: IConnection) {
    const opLog = getOpLog();
    ayakashiInstance.prop = function(propId) {
        if (typeof propId === "string" && ayakashiInstance.propRefs[propId]) {
            return ayakashiInstance.propRefs[propId];
        } else if (propId && typeof propId === "object" && propId.$$prop) {
            return propId;
        } else {
            return null;
        }
    };

    ayakashiInstance.evaluate = async function(fn, ...args) {
        return connection.evaluate(fn, ...args);
    };

    ayakashiInstance.evaluateAsync = async function(fn, ...args) {
        return connection.evaluateAsync(fn, ...args);
    };

    ayakashiInstance.defineProp = function(fn, propId) {
        const query = createQuery(ayakashiInstance, {
            propId: propId,
            triggerFn: function() {
                return ayakashiInstance.evaluate<number>(function(
                    propConstructor: () => HTMLElement[] | NodeList,
                id: string) {
                    const elements = propConstructor();
                    let matches: HTMLElement[];
                    if (Array.isArray(elements) || elements instanceof NodeList) {
                        matches = <HTMLElement[]>Array.from(elements);
                    } else {
                        matches = [elements];
                    }
                    window.ayakashi.propTable[id] = {
                        matches: matches
                    };
                    return matches.length;
                }, fn, query.id);
            }
        });
        ayakashiInstance.propRefs[query.id] = query;
        return query;
    };

    ayakashiInstance.pause = async function() {
        try {
            await ayakashiInstance.evaluate(function() {
                console.warn("[Ayakashi]: scrapper execution is paused, run ayakashi.resume() in devtools to resume");
                window.ayakashi.paused = true;
            });
            opLog.warn("scrapper execution is paused, run ayakashi.resume() in devtools to resume");
            await ayakashiInstance.waitUntil<boolean>(function() {
                return ayakashiInstance.evaluate<boolean>(function() {
                    return window.ayakashi.paused === false;
                });
            }, 100, 0);
            opLog.warn("scrapper execution is resumed");
        } catch (e) {
            throw e;
        }
    };

    ayakashiInstance.registerAction = function(name, actionFn) {
        d("registering action:", name);
        if (!name || typeof name !== "string" ||
            !actionFn || typeof actionFn !== "function") {
            throw new Error("Invalid action");
        }
        if (name in ayakashiInstance) throw new Error(`There is an action "${name}" already registered`);
        //@ts-ignore
        ayakashiInstance[name] = function(...args) {
            return actionFn.call(ayakashiInstance, ...args);
        };
    };

    ayakashiInstance.registerExtractor = function(extractorName, extractorFn, dependsOn) {
        d("registering extractor:", extractorName);
        if (!extractorName || typeof extractorName !== "string" ||
            !extractorFn || typeof extractorFn !== "function") {
            throw new Error("Invalid extractor");
        }
        if (extractorName in ayakashiInstance.extractors) {
            throw new Error(`Extractor ${extractorName} already exists`);
        }
        ayakashiInstance.extractors[extractorName] = async function() {
            if (dependsOn && Array.isArray(dependsOn)) {
                await Promise.all(dependsOn.map(function(dependency) {
                    if (dependency in ayakashiInstance.extractors) {
                        return ayakashiInstance.extractors[dependency]();
                    } else {
                        return Promise.resolve();
                    }
                }));
            }
            await ayakashiInstance.evaluate(function(name: string, fn: ExtractorFn) {
                window.ayakashi.extractors[name] = fn;
            }, extractorName, extractorFn);
        };
    };

}
