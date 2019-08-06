import {IAyakashiInstance} from "../prelude";
import {IRenderlessAyakashiInstance} from "../renderlessPrelude";
import {IApiAyakashiInstance} from "../apiPrelude";
import {retry as asyncRetry} from "async";
import {ExponentialStrategy} from "backoff";
import {getOpLog} from "../../opLog/opLog";
import {sep} from "path";
// import debug from "debug";
// const d = debug("ayakashi:prelude:retry");

export interface IRetryActions {
/**
 * Retry an async operation.
 * Default is 10 retries.
 * If the operation returns a result, that result will also be returned by retry.
 * Learn more about retries at: https://ayakashi.io/docs/going_deeper/automatic_retries.html
 * ```js
await ayakashi.retry(async function() {
    await ayakashi.goTo("https://github.com/ayakashi-io/ayakashi");
}, 5);
```
*/
    retry: <T>(task: (currentRetry: number) => Promise<T>, retries?: number) => Promise<T>;
}

export function attachRetry(ayakashiInstance: IAyakashiInstance | IRenderlessAyakashiInstance | IApiAyakashiInstance) {
    const opLog = getOpLog();

    //@ts-ignore
    ayakashiInstance.retry = async function(task, retries = 10) {
        if (!task || typeof task !== "function") {
            throw new Error("<retry> requires a function to run");
        }
        if (retries <= 0) {
            //tslint:disable no-parameter-reassignment
            retries = 10;
            //tslint:enable
        }
        let retried = 0;
        const strategy = new ExponentialStrategy({
            randomisationFactor: 0.5,
            initialDelay: 500,
            maxDelay: 5000,
            factor: 2
        });
        const errForStack = new Error();
        Error.captureStackTrace(errForStack, ayakashiInstance.retry);
        let filename = "";
        if (errForStack && errForStack.stack) {
            const stackMatch = errForStack.stack.match(/\/([\/\w-_\.]+\.js):(\d*):(\d*)/);
            if (stackMatch && stackMatch[0]) {
                filename = stackMatch[0].split(sep).pop() || "";
            }
        }
        return new Promise(function(resolve, reject) {
            asyncRetry({
                times: retries,
                interval: function() {
                    return strategy.next();
                }
            }, function(cb) {
                let taskResult;
                taskResult = task(retried + 1);
                if (taskResult instanceof Promise) {
                    taskResult
                    .then(function(result) {
                        cb(null, result);
                    })
                    .catch(function(err) {
                        retried += 1;
                        console.error(err);
                        if (retried < retries) {
                            opLog.warn(`operation ${filename} will be retried -`, `retries: ${retried}/${retries}`);
                        } else {
                            opLog.error(`${retries} retries reached for ${filename} - operation will fail`);
                        }
                        cb(err);
                    });
                } else {
                    reject(new Error("<retry> requires an async function that returns a promise"));
                }
            }, function(err, result) {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    };
}
