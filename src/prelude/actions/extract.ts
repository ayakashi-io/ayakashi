import {IDomProp} from "../query/query";
import {IAyakashiInstance} from "../prelude";
import {IRenderlessAyakashiInstance} from "../renderlessPrelude";
import {getOpLog} from "../../opLog/opLog";
import {isRegExp} from "util";

export interface IExtractActions {
/**
 * Extracts data from a prop.
 * Learn more here: https://ayakashi-io.github.io/docs/guide/data-extraction.html
 * ```js
ayakashi.select("myDivProp").where({id: {eq: "myDiv"}});
const result = await ayakashi.extract("myDivProp");
```
*/
    extract: <T = string, U = T>(
        propId: string | IDomProp,
        extractable?: Extractable<T, U>
    ) => Promise<(T | U)[]>;

/**
 * Extracts data from the first match of a prop.
 * Learn more here: https://ayakashi-io.github.io/docs/guide/data-extraction.html
 * ```js
ayakashi.select("myDivProp").where({id: {eq: "myDiv"}});
const result = await ayakashi.extractFirst("myDivProp");
```
*/
    extractFirst: <T = string, U = T>(
        propId: string | IDomProp,
        extractable?: Extractable<T, U>
    ) => Promise<T | U | null>;

/**
 * Extracts data from the last match of a prop.
 * Learn more here: https://ayakashi-io.github.io/docs/guide/data-extraction.html
 * ```js
ayakashi.select("myDivProp").where({id: {eq: "myDiv"}});
const result = await ayakashi.extractLast("myDivProp");
```
*/
    extractLast: <T = string, U = T>(
        propId: string | IDomProp,
        extractable?: Extractable<T, U>
    ) => Promise<T | U | null>;
}

//tslint:disable no-any
export type ExtractorFn = (this: Window["ayakashi"]) => {
    extract: (el: any) => any,
    isValid: (result: any) => boolean,
    useDefault: () => any
};
//tslint:enable no-any

export type Extractable<T, U> =
    string |
    ((el: HTMLElement, index: number) => T | U) |
    RegExp |
    [string | RegExp, U];

export function attachExtract(ayakashiInstance: IAyakashiInstance | IRenderlessAyakashiInstance) {
    ayakashiInstance.extract = async function<T, U>(
        propId: string | IDomProp,
        extractable: Extractable<T, U> = "text"
    ) {
        const prop = this.prop(propId);
        if (!prop) throw new Error(`<extract> needs a valid prop`);
        const matchCount = await prop.trigger();
        if (matchCount === 0) return [];
        const results = await recursiveExtract<T, U>(ayakashiInstance, extractable, prop);
        return results.map(result => result.result);
    };

    ayakashiInstance.extractFirst = async function<T, U>(
        propId: string | IDomProp,
        extractable: Extractable<T, U> = "text"
    ) {
        const prop = this.prop(propId);
        if (!prop) throw new Error(`<extractFirst> needs a valid prop`);
        const matchCount = await prop.trigger();
        if (matchCount === 0) return null;
        const results = await recursiveExtract<T, U>(ayakashiInstance, extractable, prop, 1);
        return results[0].result;
    };

    ayakashiInstance.extractLast = async function<T, U>(
        propId: string | IDomProp,
        extractable: Extractable<T, U> = "text"
    ) {
        const prop = this.prop(propId);
        if (!prop) throw new Error(`<extractLast> needs a valid prop`);
        const matchCount = await prop.trigger();
        if (matchCount === 0) return null;
        const results = await recursiveExtract<T, U>(ayakashiInstance, extractable, prop, -1);
        return results[0].result;
    };
}

async function recursiveExtract<T, U>(
    ayakashiInstance: IAyakashiInstance | IRenderlessAyakashiInstance,
    extractable: Extractable<T, U>,
    prop: IDomProp,
    matchPointer?: 1 | -1
): Promise<{result: T | U, isDefault: boolean}[]> {
    const opLog = getOpLog();

    if (typeof extractable === "string") {
        if (extractable in ayakashiInstance.extractors) {
            await ayakashiInstance.extractors[extractable]();
            return ayakashiInstance.evaluate(function(scopedPropId: string, scopedExtractorName: string, pointer?: 1 | -1) {
                //@ts-ignore
                const extractor = this.extractors[scopedExtractorName]();
                let matches = this.propTable[scopedPropId].matches;
                if (pointer === 1) {
                    matches = [matches[0]];
                }
                if (pointer === -1) {
                    matches = [matches[matches.length - 1]];
                }
                return matches.map(function(match) {
                    const result = extractor.extract(match);
                    if (extractor.isValid(result) && result !== undefined) {
                        return {result: result, isDefault: false};
                    } else {
                        let def = extractor.useDefault();
                        if (def === undefined) {
                            def = "";
                        }
                        return {result: def, isDefault: true};
                    }
                });
            }, prop.id, extractable, matchPointer);
        } else {
            return ayakashiInstance.evaluate(function(scopedPropId: string, attr: string, pointer?: 1 | -1) {
                let matches = this.propTable[scopedPropId].matches;
                if (pointer === 1) {
                    matches = [matches[0]];
                }
                if (pointer === -1) {
                    matches = [matches[matches.length - 1]];
                }
                function formatDataAttribute(dataAttr: string) {
                    const myDataAttr = dataAttr.replace("data-", "");
                    const formatted = [];
                    let upcased = false;
                    for (let i = 0; i < myDataAttr.length; i += 1) {
                        if (upcased) {
                            upcased = false;
                            continue;
                        }
                        if (myDataAttr[i] === "-" && (!myDataAttr[i + 1] || myDataAttr[i + 1] !== "-")) {
                            if (myDataAttr[i + 1]) {
                                formatted.push(myDataAttr[i + 1].toUpperCase());
                            } else {
                                formatted.push("-");
                            }
                            upcased = true;
                        } else {
                            formatted.push(myDataAttr[i]);
                        }
                    }
                    return formatted.join("");
                }
                return matches.map(function(match) {
                    try {
                        let myAttr = attr;
                        if (myAttr.includes("data-")) {
                            myAttr = formatDataAttribute(attr);
                        }
                        //@ts-ignore
                        if (match[myAttr]) {
                            //@ts-ignore
                            return {result: <T>match[myAttr], isDefault: false};
                        } else if (match.getAttribute(myAttr)) {
                            return {result: <T>(<unknown>match.getAttribute(myAttr)), isDefault: false};
                        } else if (match.dataset && match.dataset[myAttr]) {
                            return {result: <T>(<unknown>match.dataset[myAttr]), isDefault: false};
                        } else {
                            return {result: <T>(<unknown>""), isDefault: true};
                        }
                    } catch (_e) {
                        return {result: <T>(<unknown>""), isDefault: true};
                    }
                });
            }, prop.id, extractable, matchPointer);
        }
    } else if (Array.isArray(extractable)) {
        const matchResults = await recursiveExtract<T, U>(ayakashiInstance, extractable[0], prop, matchPointer);
        return matchResults.map(function(matchResult) {
            if (matchResult.isDefault) {
                if (extractable.length > 1) {
                    return {result: extractable[1], isDefault: true};
                } else {
                    return {result: matchResult.result, isDefault: false};
                }
            } else {
                return {result: matchResult.result, isDefault: false};
            }
        });
    } else if (typeof extractable === "function") {
        return ayakashiInstance.evaluate(function(scopedPropId: string, fn: Function, pointer?: 1 | -1) {
            let matches = this.propTable[scopedPropId].matches;
            if (pointer === 1) {
                matches = [matches[0]];
            }
            if (pointer === -1) {
                matches = [matches[matches.length - 1]];
            }
            return matches.map(function(match, index) {
                return {result: fn(match, index), isDefault: false};
            });
        }, prop.id, extractable, matchPointer);
    } else if (isRegExp(extractable)) {
        return ayakashiInstance.evaluate(function(scopedPropId: string, regex: RegExp, pointer?: 1 | -1) {
            let matches = this.propTable[scopedPropId].matches;
            if (pointer === 1) {
                matches = [matches[0]];
            }
            if (pointer === -1) {
                matches = [matches[matches.length - 1]];
            }
            return matches.map(function(match) {
                let regexResult = "";
                if (match.textContent) {
                    const regexMatch = match.textContent.match(regex);
                    if (regexMatch && regexMatch[0]) {
                        regexResult = regexMatch[0];
                    }
                }
                return {result: <T>(<unknown>regexResult), isDefault: regexResult === ""};
            });
        }, prop.id, extractable, matchPointer);
    } else {
        if (typeof extractable === "object" && extractable !== null) {
            opLog.warn("Nested or multiple extractions per prop are deprecated");
            opLog.warn("Learn more here: https://ayakashi-io.github.io/docs/guide/data-extraction.html");
        }
        throw new Error("Invalid extractable");
    }
}
