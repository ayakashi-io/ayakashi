import {IDomProp} from "../query/query";
import {IAyakashiInstance} from "../prelude";
import {isRegExp} from "util";

//tslint:disable no-any
export type ExtractorFn = () => {
    extract: (el: any) => any,
    isValid: (result: any) => boolean,
    useDefault: () => any
};

export type Extractable =
    string | {
        [key: string]: Extractable
    } |
    ((el: any, index: number) => any) |
    RegExp |
    [string | RegExp, any];
//tslint:enable no-any

export function attachExtract(ayakashiInstance: IAyakashiInstance) {
    ayakashiInstance.extract =
    async function(
        propId: string | IDomProp,
        extractable: Extractable = "text"
    ) {
        const prop = this.prop(propId);
        if (!prop) throw new Error(`<extract> needs a valid prop`);
        const matchCount = await prop.trigger();
        if (matchCount === 0) return [];
        const results = await recursiveExtract(ayakashiInstance, extractable, prop);
        //format the result in case it was a simple string match
        if (results && results.length > 0 && typeof results[0] === "object" && "isMatch" in results[0]) {
            return results.map((result: {result: unknown}) => ({[prop.id]: result.result}));
        } else if (results && results.length > 0 && typeof results[0] !== "object") {
            return results.map((result: {result: unknown}) => ({[prop.id]: result}));
        } else {
            return results;
        }
    };
}

async function recursiveExtract(
    ayakashiInstance: IAyakashiInstance,
    extractable: Extractable,
    prop: IDomProp
//tslint:disable no-any
): Promise<any> {
//tslint:enable no-any
    if (typeof extractable === "string") {
        if (extractable in ayakashiInstance.extractors) {
            await ayakashiInstance.extractors[extractable]();
            return ayakashiInstance.evaluate(function(scopedPropId: string, scopedExtractorName: string) {
                const extractor = window.ayakashi.extractors[scopedExtractorName]();
                return window.ayakashi.propTable[scopedPropId].matches.map(function(match) {
                    const result = extractor.extract(match);
                    if (extractor.isValid(result) && result !== undefined) {
                        return {isMatch: true, result: result};
                    } else {
                        let def = extractor.useDefault();
                        if (def === undefined) {
                            def = "";
                        }
                        return {isMatch: true, result: def, isDefault: true};
                    }
                });
            }, prop.id, extractable);
        } else {
            return ayakashiInstance.evaluate(function(scopedPropId: string, attr: string) {
                return window.ayakashi.propTable[scopedPropId].matches.map(function(match) {
                    //@ts-ignore
                    if (match[attr]) {
                        //@ts-ignore
                        return {isMatch: true, result: match[attr]};
                    } else {
                        return {isMatch: true, result: "", isDefault: true};
                    }
                });
            }, prop.id, extractable);
        }
    } else if (Array.isArray(extractable)) {
        const matchResults = await recursiveExtract(ayakashiInstance, extractable[0], prop);
        //tslint:disable no-any
        return matchResults.map(function(matchResult: {isDefault?: boolean, result: any}) {
            if (matchResult.isDefault) {
                if (extractable.length > 1) {
                    return extractable[1];
                } else {
                    return matchResult.result;
                }
            } else {
                return matchResult.result;
            }
        });
        //tslint:enable no-any
    } else if (typeof extractable === "function") {
        return ayakashiInstance.evaluate(function(scopedPropId: string, fn: Function) {
            return window.ayakashi.propTable[scopedPropId].matches.map(function(match, index) {
                return {isMatch: true, result: fn(match, index)};
            });
        }, prop.id, extractable);
    } else if (isRegExp(extractable)) {
        return ayakashiInstance.evaluate(function(scopedPropId: string, regex: RegExp) {
            return window.ayakashi.propTable[scopedPropId].matches.map(function(match) {
                let regexResult = "";
                if (match.textContent) {
                    const regexMatch = match.textContent.match(regex);
                    if (regexMatch && regexMatch[0]) {
                        regexResult = regexMatch[0];
                    }
                }
                return {isMatch: true, result: regexResult, isDefault: regexResult === ""};
            });
        }, prop.id, extractable);
    } else {
        //tslint:disable no-any
        const result: {[key: string]: any}[] = [];
        await Promise.all(Object.keys(extractable).map(function(key) {
            return new Promise(function(resolve, reject) {
                recursiveExtract(ayakashiInstance, extractable[key], prop).then(function(matchResults) {
                    matchResults.forEach(function(matchResult: any, localIndex: number) {
                        if (matchResult.isMatch) {
                            if (result[localIndex]) {
                                result[localIndex] = {
                                    ...result[localIndex],
                                    ...{[key]: matchResult.result}
                                };
                            } else {
                                result.push({[key]: matchResult.result});
                            }
                        } else {
                            result[localIndex] = {...result[localIndex], ...{[key]: matchResult}};
                        }
                    });
                    resolve();
                })
                .catch(function(err) {
                    reject(err);
                });
            });
        }));
        return result;
        //tslint:enable no-any
    }
}
