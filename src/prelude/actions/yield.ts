import {IAyakashiInstance} from "../prelude";
import {IRenderlessAyakashiInstance} from "../renderlessPrelude";
import {IApiAyakashiInstance} from "../apiPrelude";
import {IPipeProcClient} from "pipeproc";

//tslint:disable no-any
export interface IYieldActions {
/**
 * Yields extracted data from a scraper to the next step of the pipeline.
 * Learn more about yield here: https://ayakashi.io/docs/going_deeper/yielding-data.html
 * ```js
ayakashi.select("myDivProp").where({id: {eq: "myDiv"}});
const result = await ayakashi.extract("myDivProp");
await ayakashi.yield(result);
```
*/
    yield: (extracted: any | Promise<any>) => Promise<void>;
/**
 * Yields multiple extractions individually in a single (atomic) operation.
 * The next step of the pipeline will run for each extraction.
 * Learn more about yieldEach here: https://ayakashi.io/docs/going_deeper/yielding-data.html
 * ```js
await ayakashi.yieldEach(extractedLinks);
//is kinda like this
for (const link of extractedLinks) {
    await ayakashi.yield(link);
}
//but ensures the yields are performed as a single unit
```
*/
    yieldEach: (extracted: any[] | Promise<any[]>) => Promise<void>;
/**
 * Recursively re-run the scraper by yielding the extracted data to itself.
 * The data will be available in the input object.
 * Learn more about recursiveYield here: https://ayakashi.io/docs/going_deeper/yielding-data.html
*/
    recursiveYield: (extracted: any | Promise<any>) => Promise<void>;
/**
 * Recursively re-run the scraper by yielding multiple extractions individually in a single (atomic) operation.
 * The data will be available in the input object.
 * Learn more about recursiveYieldEach here: https://ayakashi.io/docs/going_deeper/yielding-data.html
*/
    recursiveYieldEach: (extracted: any[] | Promise<any[]>) => Promise<void>;
}
//tslint:enable no-any

export function attachYields(
    ayakashiInstance: IAyakashiInstance | IRenderlessAyakashiInstance | IApiAyakashiInstance,
    pipeprocClient: IPipeProcClient,
    saveTopic: string,
    selfTopic: string,
    yieldWatcher: {yieldedAtLeastOnce: boolean}
) {
    ayakashiInstance.yield = async function(extracted) {
        if (extracted instanceof Promise) {
            const actualExtracted = await extracted;
            if (!actualExtracted) return;
            await pipeprocClient.commit({
                topic: saveTopic,
                body: {value: actualExtracted}
            });
            yieldWatcher.yieldedAtLeastOnce = true;
        } else {
            if (!extracted) return;
            await pipeprocClient.commit({
                topic: saveTopic,
                body: {value: extracted}
            });
            yieldWatcher.yieldedAtLeastOnce = true;
        }
    };

    ayakashiInstance.yieldEach = async function(extracted) {
        if (extracted instanceof Promise) {
            const actualExtracted = await extracted;
            if (!Array.isArray(actualExtracted) || actualExtracted.length === 0) {
                throw new Error("<yieldEach> requires an array");
            }
            await pipeprocClient.commit(actualExtracted.map(ex => {
                return {
                    topic: saveTopic,
                    body: {value: ex}
                };
            }));
            yieldWatcher.yieldedAtLeastOnce = true;
        } else {
            if (!Array.isArray(extracted) || extracted.length === 0) {
                throw new Error("<yieldEach> requires an array");
            }
            await pipeprocClient.commit(extracted.map(ex => {
                return {
                    topic: saveTopic,
                    body: {value: ex}
                };
            }));
            yieldWatcher.yieldedAtLeastOnce = true;
        }
    };

    ayakashiInstance.recursiveYield = async function(extracted) {
        if (extracted instanceof Promise) {
            const actualExtracted = await extracted;
            if (!actualExtracted) return;
            await pipeprocClient.commit({
                topic: selfTopic,
                body: {value: actualExtracted}
            });
        } else {
            if (!extracted) return;
            await pipeprocClient.commit({
                topic: selfTopic,
                body: {value: extracted}
            });
        }
    };

    ayakashiInstance.recursiveYieldEach = async function(extracted) {
        if (extracted instanceof Promise) {
            const actualExtracted = await extracted;
            if (!Array.isArray(actualExtracted) || actualExtracted.length === 0) {
                throw new Error("<recursiveYieldEach> requires an array");
            }
            await pipeprocClient.commit(actualExtracted.map(ex => {
                return {
                    topic: selfTopic,
                    body: {value: ex}
                };
            }));
        } else {
            if (!Array.isArray(extracted) || extracted.length === 0) {
                throw new Error("<recursiveYieldEach> requires an array");
            }
            await pipeprocClient.commit(extracted.map(ex => {
                return {
                    topic: selfTopic,
                    body: {value: ex}
                };
            }));
        }
    };
}
