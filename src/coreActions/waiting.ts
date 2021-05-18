import {IAyakashiInstance} from "../prelude/prelude";
import {IDomProp} from "../prelude/query/query";

declare module "../prelude/prelude" {
    export interface IAyakashiInstance {
/**
 * Waits for a specified amount of ms.
 * ```js
await ayakashi.wait(3000);
```
*/
        wait: (timeout?: number) => Promise<void>;
/**
 * Waits by executing the callback until it returns a truthy value in a set interval.
 * The interval parameter can configure the callback execution interval (default 100ms).
 * A timeout can be specified (in ms) to throw an error if the time is exceeded (default 10s).
 * ```js
await ayakashi.waitUntil(function() {
    return ayakashi.evaluate(function() {
        //check for something in the page
    });
});
```
*/
        waitUntil: <T>(cb: () => Promise<T>, interval?: number, timeout?: number) => Promise<T>;
/**
 * Waits for the load event of a new page.
 * Learn more at https://ayakashi.io/docs/going_deeper/page-navigation.html#using-the-raw-events
*/
        waitForLoadEvent: (timeout?: number) => Promise<void>;
/**
 * Waits for the domContentLoaded event of a new page.
 * Learn more at https://ayakashi.io/docs/going_deeper/page-navigation.html#using-the-raw-events
*/
        waitForDomContentLoadedEvent: (timeout?: number) => Promise<void>;
/**
 * Waits for an in-page navigation to occur in a dynamic page or single page application.
 * Learn more at https://ayakashi.io/docs/going_deeper/page-navigation.html#using-the-raw-events
*/
        waitForInPageNavigation: (timeout?: number) => Promise<void>;
/**
 * Waits until a prop exists on the page by re-evaluating its query until it finds a match.
 * A timeout can be specified (in ms) to throw an error if the time is exceeded (default 10s).
 * Use a timeout of 0 to disable the timeout.
 * ```js
ayakashi
    .select("myProp")
    .where({class: {eq: "dynamicContainer"}});
await ayakashi.waitUntilExists("myProp");
```
*/
        waitUntilExists: (prop: IDomProp | string, timeout?: number) => Promise<void>;
/**
 * Waits until a prop exists on the page and is also visible.
 * A timeout can be specified (in ms) to throw an error if the time is exceeded (default 10s).
 * Use a timeout of 0 to disable the timeout.
 * ```js
ayakashi
    .select("myProp")
    .where({class: {eq: "dynamicContainer"}});
await ayakashi.waitUntilVisible("myProp");
```
*/
        waitUntilVisible: (prop: IDomProp | string, timeout?: number) => Promise<void>;
    }
}

export default function(ayakashiInstance: IAyakashiInstance) {
    ayakashiInstance.registerAction("wait", function(timeout = 1000): Promise<void> {
        return new Promise(function(resolve) {
            ayakashiInstance.__connection.timeouts.push(setTimeout(function() {
                resolve();
            }, timeout));
        });
    });

    ayakashiInstance.registerAction("waitUntil", function<T>(
        cb: () => Promise<T>,
        interval: number = 100,
        timeout: number = 2000
    ): Promise<T> {
        if (typeof cb !== "function") {
            throw new Error("<waitUntil> needs a callback");
        }
        if (!interval || interval <= 0) {
            throw new Error("<waitUntil> needs a positive interval");
        }
        if (timeout < 0) {
            throw new Error("<waitUntil> needs a positive timeout");
        }
        return new Promise<T>(function(resolve, reject) {
            let resolved = false;
            let aborted = false;
            const waiter = setInterval(async function() {
                const cbResult = await cb();
                if (cbResult && !aborted) {
                    resolved = true;
                    clearInterval(waiter);
                    resolve(cbResult);
                }
            }, interval);
            if (timeout !== 0) {
                const timedOut = setTimeout(function() {
                    if (!resolved) {
                        aborted = true;
                        clearInterval(waiter);
                        reject(new Error(`<waitUntil> timed out after waiting ${timeout}ms`));
                    }
                }, timeout);
                ayakashiInstance.__connection.timeouts.push(timedOut);
            }
            ayakashiInstance.__connection.intervals.push(waiter);
        });
    });

    ayakashiInstance.registerAction("waitForInPageNavigation", async function(timeout = 10000): Promise<void> {
        return new Promise(function(resolve, reject) {
            let resolved = false;
            let aborted = false;
            const unsubscribe = ayakashiInstance.__connection.client.Page.navigatedWithinDocument(function() {
                if (!aborted) {
                    resolved = true;
                    unsubscribe();
                    resolve();
                }
            });
            if (timeout !== 0) {
                const timedOut = setTimeout(function() {
                    if (!resolved) {
                        aborted = true;
                        unsubscribe();
                        reject(new Error(`<waitForInPageNavigation> timed out after waiting ${timeout}ms`));
                    }
                }, timeout);
                ayakashiInstance.__connection.timeouts.push(timedOut);
            }
            ayakashiInstance.__connection.unsubscribers.push(unsubscribe);
        });
    });

    ayakashiInstance.registerAction("waitForLoadEvent", function(timeout = 10000): Promise<void> {
        return new Promise(function(resolve, reject) {
            let resolved = false;
            let aborted = false;
            const unsubscribe = ayakashiInstance.__connection.client.Page.loadEventFired(function() {
                if (!aborted) {
                    resolved = true;
                    unsubscribe();
                    resolve();
                }
            });
            if (timeout !== 0) {
                const timedOut = setTimeout(function() {
                    if (!resolved) {
                        aborted = true;
                        unsubscribe();
                        reject(new Error(`<waitForLoadEvent> timed out after waiting ${timeout}ms`));
                    }
                }, timeout);
                ayakashiInstance.__connection.timeouts.push(timedOut);
            }
            ayakashiInstance.__connection.unsubscribers.push(unsubscribe);
        });
    });

    ayakashiInstance.registerAction("waitForDomContentLoadedEvent", function(timeout = 10000): Promise<void> {
        return new Promise(function(resolve, reject) {
            let resolved = false;
            let aborted = false;
            const unsubscribe = ayakashiInstance.__connection.client.Page.domContentEventFired(function() {
                if (!aborted) {
                    resolved = true;
                    unsubscribe();
                    resolve();
                }
            });
            if (timeout !== 0) {
                const timedOut = setTimeout(function() {
                    if (!resolved) {
                        aborted = true;
                        unsubscribe();
                        reject(new Error(`<waitForDomContentLoadedEvent> timed out after waiting ${timeout}ms`));
                    }
                }, timeout);
                ayakashiInstance.__connection.timeouts.push(timedOut);
            }
            ayakashiInstance.__connection.unsubscribers.push(unsubscribe);
        });
    });

    ayakashiInstance.registerAction("waitUntilExists",
    async function(prop: IDomProp, timeout = 10000): Promise<boolean> {
        const myProp = this.prop(prop);
        if (!myProp) {
            throw new Error("<waitUntilExists> needs a valid prop");
        }
        return ayakashiInstance.waitUntil<boolean>(async function() {
            const matchCount = await myProp.trigger({force: true, showNoMatchesWarning: false});
            return matchCount > 0;
        }, 100, timeout);
    });

    ayakashiInstance.registerAction("waitUntilVisible",
    async function(prop: IDomProp, timeout = 10000): Promise<boolean> {
        const myProp = this.prop(prop);
        if (!myProp) {
            throw new Error("<waitUntilVisible> needs a valid prop");
        }
        await this.waitUntilExists(myProp, timeout);
        return ayakashiInstance.waitUntil<boolean>(async function() {
            return ayakashiInstance.evaluate(function(scopedPropId) {
                const node = this.propTable[scopedPropId].matches[0];
                return !!(node.offsetWidth || node.offsetHeight || node.getClientRects().length);
            }, myProp.id);
        }, 100, timeout);
    });
}
