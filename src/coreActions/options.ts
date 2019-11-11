import {IAyakashiInstance} from "../prelude/prelude";
import {IDomProp} from "../prelude/query/query";

declare module "../prelude/prelude" {
    export interface IAyakashiInstance {
/**
 * Checks a checkbox prop if it is not already checked.
 * ```js
ayakashi.selectOne("myCheckboxProp").where({id: {eq: "myCheckbox"}});
await ayakashi.check("myCheckboxProp");
```
*/
        check: (prop: IDomProp | string) => Promise<void>;
/**
 * Unchecks a checkbox prop if it is already checked.
 * ```js
ayakashi.selectOne("myCheckboxProp").where({id: {eq: "myCheckbox"}});
await ayakashi.uncheck("myCheckboxProp");
```
*/
        uncheck: (prop: IDomProp | string) => Promise<void>;
    }
}

export default function(ayakashiInstance: IAyakashiInstance) {
    ayakashiInstance.registerAction("check", async function(prop: IDomProp | string) {
        const myProp = this.prop(prop);
        if (!myProp) throw new Error("<check> needs a valid prop");
        const matchCount = await myProp.trigger();
        if (matchCount === 0) throw new Error("<check> needs a prop with at least 1 match");
        await this.scrollIntoView(myProp);
        const isChecked = await ayakashiInstance.evaluate(function(scopedPropId) {
            const node = this.propTable[scopedPropId].matches[0];
            return (<HTMLInputElement>node).checked === true;
        }, myProp.id);
        if (!isChecked) {
            return this.click(myProp);
        }
    });

    ayakashiInstance.registerAction("uncheck", async function(prop: IDomProp | string) {
        const myProp = this.prop(prop);
        if (!myProp) throw new Error("<uncheck> needs a valid prop");
        const matchCount = await myProp.trigger();
        if (matchCount === 0) throw new Error("<uncheck> needs a prop with at least 1 match");
        await this.scrollIntoView(myProp);
        const isChecked = await ayakashiInstance.evaluate(function(scopedPropId) {
            const node = this.propTable[scopedPropId].matches[0];
            return (<HTMLInputElement>node).checked === true;
        }, myProp.id);
        if (isChecked) {
            return this.click(myProp);
        }
    });
}
