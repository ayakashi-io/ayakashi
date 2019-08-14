import {IDomProp} from "../query/query";
import {IAyakashiInstance} from "../prelude";
import {IRenderlessAyakashiInstance} from "../renderlessPrelude";
import {isRegExp} from "util";

export interface IExtractActions {
/**
 * Extracts data from a prop.
 * Learn more here: https://ayakashi.io/docs/guide/data-extraction.html
 * ```js
ayakashi.select("myDivProp").where({id: {eq: "myDiv"}});
const result = await ayakashi.extract("myDivProp");
```
*/
    extract: <T = string, U = T>(
        propId: string | IDomProp,
        extractable?: Extractable<T, U>
    ) => Promise<(T | U)[]>;
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
    ayakashiInstance.extract =
    async function<T, U>(
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
}

async function recursiveExtract<T, U>(
    ayakashiInstance: IAyakashiInstance | IRenderlessAyakashiInstance,
    extractable: Extractable<T, U>,
    prop: IDomProp
): Promise<{result: T | U, isDefault: boolean}[]> {
    if (typeof extractable === "string") {
        if (extractable in ayakashiInstance.extractors) {
            await ayakashiInstance.extractors[extractable]();
            return ayakashiInstance.evaluate(function(scopedPropId: string, scopedExtractorName: string) {
                //@ts-ignore
                const extractor = this.extractors[scopedExtractorName]();
                return this.propTable[scopedPropId].matches.map(function(match) {
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
            }, prop.id, extractable);
        } else {
            return ayakashiInstance.evaluate(function(scopedPropId: string, attr: string) {
                return this.propTable[scopedPropId].matches.map(function(match) {
                    //@ts-ignore
                    if (match[attr]) {
                        //@ts-ignore
                        return {result: <T>match[attr], isDefault: false};
                    } else {
                        return {result: <T>(<unknown>""), isDefault: true};
                    }
                });
            }, prop.id, extractable);
        }
    } else if (Array.isArray(extractable)) {
        const matchResults = await recursiveExtract<T, U>(ayakashiInstance, extractable[0], prop);
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
        return ayakashiInstance.evaluate(function(scopedPropId: string, fn: Function) {
            return this.propTable[scopedPropId].matches.map(function(match, index) {
                return {result: fn(match, index), isDefault: false};
            });
        }, prop.id, extractable);
    } else if (isRegExp(extractable)) {
        return ayakashiInstance.evaluate(function(scopedPropId: string, regex: RegExp) {
            return this.propTable[scopedPropId].matches.map(function(match) {
                let regexResult = "";
                if (match.textContent) {
                    const regexMatch = match.textContent.match(regex);
                    if (regexMatch && regexMatch[0]) {
                        regexResult = regexMatch[0];
                    }
                }
                return {result: <T>(<unknown>regexResult), isDefault: regexResult === ""};
            });
        }, prop.id, extractable);
    } else {
        throw new Error("Invalid extractable");
    }
}
