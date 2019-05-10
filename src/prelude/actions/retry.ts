import {IAyakashiInstance} from "../prelude";
import {retry as asyncRetry} from "async";
import {ExponentialStrategy} from "backoff";
import {getOpLog} from "../../opLog/opLog";
// import debug from "debug";
// const d = debug("ayakashi:prelude:retry");

export function attachRetry(ayakashiInstance: IAyakashiInstance) {
    const opLog = getOpLog();

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
                            opLog.warn("operation will be retried -", `retries: ${retried}/${retries}`);
                        } else {
                            opLog.error(`${retries} retries reached - operation will fail`);
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
