import {retry as asyncRetry} from "async";
import {ExponentialStrategy} from "backoff";

export async function retryOnErrorOrTimeOut<T>(task: () => Promise<T>): Promise<T> {
    const strategy = new ExponentialStrategy({
        randomisationFactor: 0.5,
        initialDelay: 100,
        maxDelay: 1000,
        factor: 2
    });
    return new Promise(function(resolve, reject) {
        asyncRetry({
            times: 20,
            interval: function() {
                return strategy.next();
            }
        }, function(cb) {
            let resolved = false;
            let aborted = false;
            const timedOut = setTimeout(function() {
                if (!resolved) {
                    aborted = true;
                    cb(new Error(`timed_out`));
                }
            }, 1000);
            task()
            .then(function(taskResult) {
                if (!aborted) {
                    resolved = true;
                    clearTimeout(timedOut);
                    cb(null, taskResult);
                }
            })
            .catch(function(err: Error) {
                if (!aborted) {
                    resolved = true;
                    clearTimeout(timedOut);
                    cb(err);
                }
            });
        }, function(err, taskResult: T) {
            if (err) {
                reject(err);
            } else {
                resolve(taskResult);
            }
        });
    });
}
