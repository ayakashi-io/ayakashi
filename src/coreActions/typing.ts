import {IAyakashiInstance} from "../prelude/prelude";
import {IDomProp} from "../prelude/query/query";

declare module "../prelude/prelude" {
    export interface IAyakashiInstance {
/**
 * Types text in a prop by pressing each character one by one with a delay.
 * ```js
ayakashi.selectOne("searchBox").where({id: {eq: "search"}});
await ayakashi.typeIn("searchBox", "web scraping and sanity");
```
*/
        typeIn: (prop: IDomProp | string, text: string) => Promise<void>;
/**
 * Clears the text in a prop by pressing Backspace until the value is cleared.
 * A character count can be specified to only clear part of the text.
 * ```js
ayakashi.selectOne("myInput").where({id: {eq: "name"}});
await ayakashi.clearInput("myInput");
```
*/
        clearInput: (prop: IDomProp | string, charCount?: number) => Promise<void>;
    }
}

export default function(ayakashiInstance: IAyakashiInstance) {
    ayakashiInstance.registerAction("typeIn", async function(prop: IDomProp | string, text: string) {
        const myProp = this.prop(prop);
        if (!myProp) throw new Error("<typeIn> needs a valid prop");
        const matchCount = await myProp.trigger();
        if (matchCount === 0) throw new Error("<typeIn> needs a prop with at least 1 match");
        if (!text) throw new Error("<typeIn> needs some text to type");
        await this.scrollIntoView(myProp);
        await this.focus(myProp);
        return this.__connection.keyBoard.type(text, {delay: 100});
    });

    ayakashiInstance.registerAction("clearInput", async function(prop: IDomProp | string, charCount?: number) {
        const myProp = this.prop(prop);
        if (!myProp) throw new Error("<clearInput> needs a valid prop");
        const matchCount = await myProp.trigger();
        if (matchCount === 0) throw new Error("<clearInput> needs a prop with at least 1 match");
        const valLength = charCount ? charCount : (await this.evaluate(function(scopedPropId) {
            const node = this.propTable[scopedPropId].matches[0];
            return (<HTMLInputElement | HTMLTextAreaElement>node).value || "";
        }, myProp.id)).length;
        await this.scrollIntoView(myProp);
        await this.focus(myProp);
        for (let i = 0; i < valLength; i += 1) {
            await this.__connection.keyBoard.press("Backspace", {delay: 100});
        }
    });
}
