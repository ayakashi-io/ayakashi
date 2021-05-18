import {IAyakashiInstance} from "../prelude/prelude";
import {IDomProp} from "../prelude/query/query";

declare module "../prelude/prelude" {
    //tslint:disable max-line-length
    export interface IAyakashiInstance {
/**
 * Scrolls a prop into view.
 * ```js
ayakashi.selectOne("myButtonProp").where({class: {eq: "btn"}});
await ayakashi.scrollIntoView("myButtonProp");
```
*/
        scrollIntoView: (prop: IDomProp | string) => Promise<void>;
/**
 * Scrolls inside a scrollable prop by an amount of pixels.
 * If no pixels are specified it will scroll to the bottom of the prop.
 * Works for props with a static height.
 * Check the scrollInUntilBottomIsReached() and infiniteScrollIn() actions If the prop loads more content and expands dynamically as it is being scrolled.
 * ```js
ayakashi.selectOne("myScrollableDiv").where({class: {eq: "scrollableList"}});
await ayakashi.scrollIn("myScrollableDiv");
```
*/
        scrollIn: (prop: IDomProp | string, pixelsToScroll?: number) => Promise<number>;
/**
 * Scrolls inside a scrollable prop until its bottom is reached.
 * Works with props that load more content and expand dynamically as they are being scrolled.
 * The scrolling interval can be controlled with the interval parameter.
 * A timeout can be specified (in ms) to throw an error if the time is exceeded (default 10s) and the bottom is still not reached.
 * Use a timeout of 0 to disable the timeout.
 * ```js
ayakashi.selectOne("myDynamicScrollableDiv").where({class: {eq: "scrollableList"}});
await ayakashi.scrollInUntilBottomIsReached("myDynamicScrollableDiv");
```
*/
        scrollInUntilBottomIsReached: (
            prop: IDomProp | string,
            scrollInterval?: number,
            timeout?: number
        ) => Promise<void>;
/**
 * Infinitely scrolls inside a scrollable prop.
 * Works with props that load more content and expand dynamically as they are being scrolled.
 * A callback can be triggered on each scrolling interval to extract data as we scroll.
 * The scrolling interval can be controlled with the interval option (default 1s).
 * The pixels to scroll each time can be controlled with the pixelsToScroll option.
 * If no pixelsToScroll is provided it will scroll to the (current) bottom of the prop.
 * The scrolling can be stopped with the stopScrollingAfter option (in ms) or if the final bottom is reached and no more content is available.
 * ```js
ayakashi.selectOne("myInfiniteScrollableDiv").where({class: {eq: "scrollableList"}});
await ayakashi.infiniteScrollIn("myInfiniteScrollableDiv", {
    cb: function(currentHeight) {
        console.log("scrolling infinitely");
        console.log("current height", currentHeight);
        //let data flow in as we scroll
    }
});
```
*/
        infiniteScrollIn: (
            prop: IDomProp | string,
            options?: {
                pixelsToScroll?: number,
                stopScrollingAfter?: number,
                scrollInterval?: number,
                cb?: (currentHeight: number) => Promise<void>
            }
        ) => Promise<void>;
    }
    //tslint:enable max-line-length
}

export default function(ayakashiInstance: IAyakashiInstance) {
    ayakashiInstance.registerAction("scrollIntoView", async function(prop: IDomProp | string) {
        const myProp = this.prop(prop);
        if (!myProp) throw new Error("<scrollIntoView> needs a valid prop");
        const matchCount = await myProp.trigger();
        if (matchCount === 0) throw new Error("<scrollIntoView> needs a prop with at least 1 match");
        return this.evaluateAsync(function(scopedPropId) {
            const node = this.propTable[scopedPropId].matches[0];
            return new Promise(resolve => {
                const observer = new IntersectionObserver(function(entries) {
                  resolve(entries[0].intersectionRatio);
                  observer.disconnect();
                });
                observer.observe(node);
            }).then(function(intersectionRatio) {
                if (intersectionRatio !== 1) {
                    node.scrollIntoView({block: "center", inline: "center"});
                }
            });
        }, myProp.id);
    });

    ayakashiInstance.registerAction("scrollIn", async function(prop: IDomProp | string, pixelsToScroll?: number) {
        const myProp = this.prop(prop);
        if (!myProp) throw new Error("<scrollIn> needs a valid prop");
        const matchCount = await myProp.trigger();
        if (matchCount === 0) throw new Error("<scrollIn> needs a prop with at least 1 match");
        await this.scrollIntoView(myProp);
        return this.evaluate(function(scopedPropId: string, scopedpixelsToScroll?: number) {
            const node = this.propTable[scopedPropId].matches[0];
            if (scopedpixelsToScroll) {
                node.scrollTop += scopedpixelsToScroll;
            } else {
                node.scrollTop = node.scrollHeight;
            }
            return node.scrollTop;
        }, myProp.id, pixelsToScroll);
    });

    ayakashiInstance.registerAction("scrollInUntilBottomIsReached",
    async function(prop: IDomProp | string, scrollInterval?: number, timeout?: number) {
        const myProp = this.prop(prop);
        if (!myProp) throw new Error("<scrollInUntilBottomIsReached> needs a valid prop");
        const matchCount = await myProp.trigger();
        if (matchCount === 0) throw new Error("<scrollInUntilBottomIsReached> needs a prop with at least 1 match");
        await this.scrollIntoView(myProp);
        let previousHeight = -1;
        let currentHeight = 0;
        return new Promise<void>(function(resolve, reject) {
            ayakashiInstance.waitUntil(async function() {
                try {
                    if (previousHeight !== currentHeight) {
                        previousHeight = currentHeight;
                        currentHeight = await ayakashiInstance.scrollIn(myProp);
                        return false;
                    } else {
                        return true;
                    }
                } catch (e) {
                    reject(e);
                    return true;
                }
            }, scrollInterval, timeout)
            .then(function() {
                resolve();
            }).catch(function() {
                resolve();
            });
        });
    });

    ayakashiInstance.registerAction("infiniteScrollIn",
    async function(prop: IDomProp | string, options?: {
        pixelsToScroll?: number,
        stopScrollingAfter?: number,
        scrollInterval?: number,
        cb?: (currentHeight: number) => Promise<void>
    }) {
        const myProp = this.prop(prop);
        if (!myProp) throw new Error("<infiniteScrollIn> needs a valid prop");
        const matchCount = await myProp.trigger();
        if (matchCount === 0) throw new Error("<infiniteScrollIn> needs a prop with at least 1 match");
        await this.scrollIntoView(myProp);
        let previousHeight = -1;
        let currentHeight = 0;
        let pixelsToScroll: number | undefined;
        if (options && options.pixelsToScroll) pixelsToScroll = options.pixelsToScroll;
        let scrollInterval = 1000;
        if (options && options.scrollInterval) scrollInterval = options.scrollInterval;
        let stopScrollingAfter = 0;
        if (options && options.stopScrollingAfter) stopScrollingAfter = options.stopScrollingAfter;
        return new Promise<void>(function(resolve, reject) {
            ayakashiInstance.waitUntil(async function() {
                try {
                    if (options && typeof options.cb === "function") {
                        await options.cb(currentHeight);
                    }
                    if (previousHeight !== currentHeight) {
                        previousHeight = currentHeight;
                        currentHeight = await ayakashiInstance.scrollIn(myProp, pixelsToScroll);
                        return false;
                    } else {
                        return true;
                    }
                } catch (e) {
                    reject(e);
                    return true;
                }
            }, scrollInterval, stopScrollingAfter)
            .then(function() {
                resolve();
            }).catch(function() {
                resolve();
            });
        });
    });
}
