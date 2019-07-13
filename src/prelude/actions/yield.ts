import {IAyakashiInstance} from "../prelude";
import {IRenderlessAyakashiInstance} from "../renderlessPrelude";
import {IPipeProcClient} from "pipeproc";

export function attachYields(
    ayakashiInstance: IAyakashiInstance | IRenderlessAyakashiInstance,
    pipeprocClient: IPipeProcClient,
    saveTopic: string,
    selfTopic: string,
    yieldWatcher: {yieldedAtLeastOnce: boolean}
) {
    ayakashiInstance.yield = async function(extracted) {
        if (extracted instanceof Promise) {
            const actualExtracted = await extracted;
            if (!actualExtracted || typeof actualExtracted !== "object") return;
            await pipeprocClient.commit({
                topic: saveTopic,
                body: actualExtracted
            });
            yieldWatcher.yieldedAtLeastOnce = true;
        } else {
            if (!extracted || typeof extracted !== "object") return;
            await pipeprocClient.commit({
                topic: saveTopic,
                body: extracted
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
                    body: ex
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
                    body: ex
                };
            }));
            yieldWatcher.yieldedAtLeastOnce = true;
        }
    };

    ayakashiInstance.recursiveYield = async function(extracted) {
        if (extracted instanceof Promise) {
            const actualExtracted = await extracted;
            if (!actualExtracted || typeof actualExtracted !== "object") return;
            await pipeprocClient.commit({
                topic: selfTopic,
                body: actualExtracted
            });
        } else {
            if (!extracted || typeof extracted !== "object") return;
            await pipeprocClient.commit({
                topic: selfTopic,
                body: extracted
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
                    body: ex
                };
            }));
        } else {
            if (!Array.isArray(extracted) || extracted.length === 0) {
                throw new Error("<recursiveYieldEach> requires an array");
            }
            await pipeprocClient.commit(extracted.map(ex => {
                return {
                    topic: selfTopic,
                    body: ex
                };
            }));
        }
    };
}
