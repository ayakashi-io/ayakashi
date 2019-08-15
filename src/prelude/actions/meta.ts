import {IConnection} from "../../engine/createConnection";
import {IAyakashiInstance} from "../prelude";
import {IRenderlessAyakashiInstance} from "../renderlessPrelude";
import {createQuery, IDomProp} from "../query/query";
import {getOpLog} from "../../opLog/opLog";

import debug from "debug";
import {ExtractorFn} from "./extract";
const d = debug("ayakashi:prelude:meta");

export interface IMetaActions {
/**
 * Given a prop name or prop object returns a prop object or null if the prop is not defined.
 * Can be used to get prop references from their name or to check if the prop is valid.
 * Learn more here: https://ayakashi.io/docs/going_deeper/anonymous-props-and-references.html
 * ```js
ayakashi.prop("myProp");
```
*/
    prop: (propId: IDomProp | string) => IDomProp | null;
    //tslint:disable no-any
/**
 * Evaluates a javascript function in the current page.
 * Learn more here: https://ayakashi.io/docs/going_deeper/evaluating-javascript-expressions.html
 * ```js
const title = await ayakashi.evaluate(function() {
    return document.title;
});
```
*/
    evaluate: <T>(fn: (this: Window["ayakashi"], ...args: any[]) => T, ...args: any[]) => Promise<T>;
/**
 * Evaluates an asynchronous javascript function in the current page.
 * Learn more here: https://ayakashi.io/docs/going_deeper/evaluating-javascript-expressions.html
 * ```js
await ayakashi.evaluateAsync(function() {
    return new Promise(function(resolve) {
        setTimeout(function() {
            resolve();
        }, 1000);
    });
});
```
*/
    evaluateAsync: <T>(fn: (this: Window["ayakashi"], ...args: any[]) => Promise<T>, ...args: any[]) => Promise<T>;
    //tslint:enable no-any
/**
 * Defines a new prop without using the domQL syntax.
 * Learn more here: https://ayakashi.io/docs/going_deeper/defining-props-without-domql.html
 * ```js
ayakashi.defineProp(function() {
    return this.document.getElementById("main");
}, "mainSection");
```
*/
    defineProp: (fn: (this: Window["ayakashi"]) => HTMLElement | HTMLElement[] | NodeList, propId?: string) => IDomProp;
/**
 * Pauses the execution of the scraper.
 * Learn more here: https://ayakashi.io/docs/guide/debugging.html
 * ```js
await ayakashi.pause();
```
*/
    pause: () => Promise<void>;
    //tslint:disable no-any
/**
 * Registers a new action and makes it available in the ayakashi instance.
 * Learn more here: https://ayakashi.io/docs/advanced/creating-your-own-actions.html
 * ```js
ayakashi.registerAction("myAction", async function(prop) {
    console.log("running myAction");
});
```
*/
    registerAction: <T>(name: string, fn: (this: IAyakashiInstance, ...args: any[]) => Promise<T>) => void;
    //tslint:enable no-any
/**
 * Registers a new extractor and makes it available in the extract() method.
 * Learn more here: https://ayakashi.io/docs/advanced/creating-your-own-extractors.html
 * ```js
ayakashi.registerExtractor("id", function() {
    return {
        extract: function(element) {
            return element.id;
        },
        isValid: function(result) {
            return !!result;
        },
        useDefault: function() {
            return "no-id-found";
        }
    };
});
```
*/
    registerExtractor: (extractorName: string, extractorFn: ExtractorFn, dependsOn?: string[]) => void;
    join: (obj: {[key: string]: unknown}) => {[key: string]: unknown}[];
}

export function attachMetaActions(
    ayakashiInstance: IAyakashiInstance | IRenderlessAyakashiInstance,
    connection: IConnection
) {
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
                    propConstructor: (this: Window["ayakashi"]) => HTMLElement[] | NodeList,
                    id: string
                ) {
                    const elements = propConstructor.call(this);
                    let matches: HTMLElement[];
                    //@ts-ignore
                    if (Array.isArray(elements) || elements instanceof this.window.NodeList) {
                        matches = <HTMLElement[]>Array.from(elements);
                    } else {
                        //@ts-ignore
                        matches = [elements];
                    }
                    this.propTable[id] = {
                        matches: matches
                    };
                    return matches.length;
                }, fn, query.id);
            }
        });
        ayakashiInstance.propRefs[query.id] = query;
        return query;
    };

    (<IAyakashiInstance>ayakashiInstance).pause = async function() {
        try {
            await ayakashiInstance.evaluate(function() {
                console.warn("[Ayakashi]: scraper execution is paused, run ayakashi.resume() in devtools to resume");
                this.paused = true;
            });
            opLog.warn("scraper execution is paused, run ayakashi.resume() in devtools to resume");
            await (<IAyakashiInstance>ayakashiInstance).waitUntil<boolean>(function() {
                return ayakashiInstance.evaluate<boolean>(function() {
                    return this.paused === false;
                });
            }, 100, 0);
            opLog.warn("scraper execution is resumed");
        } catch (e) {
            throw e;
        }
    };

    (<IAyakashiInstance>ayakashiInstance).registerAction = function(name, actionFn) {
        d("registering action:", name);
        if (!name || typeof name !== "string" ||
            !actionFn || typeof actionFn !== "function") {
            throw new Error("Invalid action");
        }
        if (name in ayakashiInstance) throw new Error(`There is an action "${name}" already registered`);
        //@ts-ignore
        ayakashiInstance[name] = function(...args) {
            return actionFn.call(<IAyakashiInstance>ayakashiInstance, ...args);
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
                this.extractors[name] = fn.bind(this);
            }, extractorName, extractorFn);
        };
    };

    ayakashiInstance.join = function(obj) {
        if (!obj || typeof obj !== "object" || Object.keys(obj).length === 0) {
            throw new Error("Invalid object");
        }
        //get the max value length
        let max = 0;
        for (const val of Object.values(obj)) {
            if (Array.isArray(val)) {
                if (val.length > max) {
                    max = val.length;
                }
            }
        }
        //verify that all values' length equal the max
        for (const [key, val] of Object.entries(obj)) {
            if (Array.isArray(val) && val.length !== max) {
                throw new Error(`Property <${key}> does not have the correct length`);
            }
        }
        //save all non-arrays
        const nonArrays = [];
        for (const [key, val] of Object.entries(obj)) {
            if (!Array.isArray(val)) {
                nonArrays.push({
                    [key]: val
                });
            }
        }
        //check if we only have non-array values
        if (max === 0) {
            let j: {[key: string]: unknown} = {};
            if (nonArrays.length > 0) {
                for (const nonArray of nonArrays) {
                    j = {...j, ...nonArray};
                }
            }

            return [j];
        } else {
            //create the joined value
            const joined = [];
            for (let i = 0; i < max; i += 1) {
                let j: {[key: string]: unknown} = {};
                for (const [key, val] of Object.entries(obj)) {
                    if (Array.isArray(val)) {
                        j[key] = val[i];
                    }
                }
                //merge non-arrays
                if (nonArrays.length > 0) {
                    for (const nonArray of nonArrays) {
                        j = {...j, ...nonArray};
                    }
                }
                joined.push(j);
            }

            return joined;
        }
    };

}
