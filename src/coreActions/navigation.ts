import {IAyakashiInstance} from "../prelude/prelude";
import {IDomProp} from "../prelude/query/query";

declare module "../prelude/prelude" {
    export interface IAyakashiInstance {
/**
 * Navigates to a new page and waits for the document to load.
 * A timeout can be specified (in ms) for slow pages (default 10s).
 * Use a timeout of 0 to disable the timeout.
 * Learn more at https://ayakashi.io/docs/going_deeper/page-navigation.html#standard-navigation
 * ```js
await ayakashi.goTo("https://ayakashi.io");
```
*/
        goTo: (url: string, timeout?: number) => Promise<void>;
/**
 * Clicks on a prop to navigate to a new page.
 * It should be used instead of click() so the new page can properly load.
 * A timeout can be specified (in ms) for slow pages (default 10s).
 * Use a timeout of 0 to disable the timeout.
 * Learn more at https://ayakashi.io/docs/going_deeper/page-navigation.html#click-to-navigate
 * ```js
ayakashi
    .select("myLink")
    .where({id: {eq: "theLink"}});
await ayakashi.navigationClick("myLink");
```
*/
        navigationClick: (prop: IDomProp | string, timeout?: number) => Promise<void>;
/**
 * Clicks on a prop that changes the view in a dynamic page or single page application.
 * It should be used instead of click() so the view can properly load.
 * It will not reload the page like navigationClick().
 * A timeout can be specified (in ms) for slow pages (default 10s).
 * Use a timeout of 0 to disable the timeout.
 * Learn more at https://ayakashi.io/docs/going_deeper/page-navigation.html#single-page-application-spa-navigation
 * ```js
ayakashi
    .select("inPageLink")
    .where({id: {eq: "theLink"}});
await ayakashi.spaNavigationClick("inPageLink");
```
*/
        spaNavigationClick: (prop: IDomProp | string, timeout?: number) => Promise<void>;
    }
}

export default function(ayakashiInstance: IAyakashiInstance) {
    ayakashiInstance.registerAction("goTo", async function(url: string, timeout = 10000): Promise<void> {
        await ayakashiInstance.__connection.client.Page.stopLoading();
        return new Promise(function(resolve, reject) {
            ayakashiInstance.waitForDomContentLoadedEvent(timeout).then(function() {
                resolve();
            }).catch(reject);
            ayakashiInstance.__connection.client.Page.navigate({url}).catch(function() {
                reject(new Error(`Could not load page: ${url}`));
            });
        });
    });

    ayakashiInstance.registerAction("navigationClick", async function(prop: IDomProp, timeout = 10000): Promise<void> {
        const myProp = this.prop(prop);
        if (!myProp) throw new Error("<navigationClick> needs a valid prop");
        const matchCount = await myProp.trigger();
        if (matchCount === 0) throw new Error("<navigationClick> needs a prop with at least 1 match");
        await ayakashiInstance.__connection.client.Page.stopLoading();
        await ayakashiInstance.evaluate(function(scopedPropId: string) {
            this.propTable[scopedPropId].matches.forEach(function(link) {
                if ((<HTMLAnchorElement>link).target === "_blank") {
                    (<HTMLAnchorElement>link).target = "_self";
                }
            });
        }, myProp.id);
        return new Promise(function(resolve, reject) {
            ayakashiInstance.waitForDomContentLoadedEvent(timeout).then(function() {
                resolve();
            }).catch(reject);
            ayakashiInstance.click(prop).catch(reject);
        });
    });

    ayakashiInstance.registerAction("spaNavigationClick", function(prop: IDomProp, timeout = 10000): Promise<void> {
        return new Promise(function(resolve, reject) {
            ayakashiInstance.waitForInPageNavigation(timeout).then(function() {
                resolve();
            }).catch(reject);
            ayakashiInstance.click(prop).catch(reject);
        });
    });
}
