import {IAyakashiInstance} from "../prelude/prelude";
import {IDomProp} from "../prelude/query/query";

declare module "../prelude/prelude" {
    export interface IAyakashiInstance {
/**
 * Clicks on a prop
 * ```js
ayakashi.selectOne("myButtonProp").where({class: {eq: "btn"}});
await ayakashi.click("myButtonProp");
```
*/
        click: (prop: IDomProp | string) => Promise<void>;
/**
 * Double-clicks on a prop
 * ```js
ayakashi.selectOne("myButtonProp").where({class: {eq: "btn"}});
await ayakashi.doubleClick("myButtonProp");
```
*/
        doubleClick: (prop: IDomProp | string) => Promise<void>;
/**
 * Right-clicks on a prop
 * ```js
ayakashi.selectOne("menuOpener").where({class: {eq: "menu-trigger"}});
await ayakashi.rightClick("menuOpener");
```
*/
        rightClick: (prop: IDomProp | string) => Promise<void>;
/**
 * Taps on a prop. Same as click() but dispatches touch events instead of mouse events.
 * ```js
ayakashi.selectOne("myButtonProp").where({class: {eq: "btn"}});
await ayakashi.tap("myButtonProp");
```
*/
        tap: (prop: IDomProp | string) => Promise<void>;
    }
}

export default function(ayakashiInstance: IAyakashiInstance) {
    ayakashiInstance.registerAction("click", async function(prop: IDomProp | string) {
        const myProp = this.prop(prop);
        if (!myProp) throw new Error("<click> needs a valid prop");
        const matchCount = await myProp.trigger();
        if (matchCount === 0) throw new Error("<click> needs a prop with at least 1 match");
        await this.scrollIntoView(myProp);
        const pos = await this.getPosition(myProp);
        return this.__connection.mouse.click(pos.x, pos.y);
    });

    ayakashiInstance.registerAction("doubleClick", async function(prop: IDomProp | string) {
        const myProp = this.prop(prop);
        if (!myProp) throw new Error("<doubleClick> needs a valid prop");
        const matchCount = await myProp.trigger();
        if (matchCount === 0) throw new Error("<doubleClick> needs a prop with at least 1 match");
        await this.scrollIntoView(myProp);
        const pos = await this.getPosition(myProp);
        return this.__connection.mouse.click(pos.x, pos.y, {clickCount: 2});
    });

    ayakashiInstance.registerAction("rightClick", async function(prop: IDomProp | string) {
        const myProp = this.prop(prop);
        if (!myProp) throw new Error("<rightClick> needs a valid prop");
        const matchCount = await myProp.trigger();
        if (matchCount === 0) throw new Error("<rightClick> needs a prop with at least 1 match");
        await this.scrollIntoView(myProp);
        const pos = await this.getPosition(myProp);
        return this.__connection.mouse.click(pos.x, pos.y, {button: "right"});
    });

    ayakashiInstance.registerAction("tap", async function(prop: IDomProp | string) {
        const myProp = this.prop(prop);
        if (!myProp) throw new Error("<tap> needs a valid prop");
        const matchCount = await myProp.trigger();
        if (matchCount === 0) throw new Error("<tap> needs a prop with at least 1 match");
        await this.scrollIntoView(myProp);
        const pos = await this.getPosition(myProp);
        return this.__connection.touchScreen.tap(pos.x, pos.y);
    });
}
