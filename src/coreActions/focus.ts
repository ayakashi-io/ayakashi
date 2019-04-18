import {IAyakashiInstance} from "../prelude/prelude";
import {IDomProp} from "../prelude/query/query";

declare module "../prelude/prelude" {
    export interface IAyakashiInstance {
/**
 * Focuses on a prop
 * ```js
ayakashi.selectOne("myInput").where({id: {eq: "email"}});
await ayakashi.focus("myInput");
```
*/
        focus: (prop: IDomProp | string) => Promise<void>;
    }
}

export default function(ayakashiInstance: IAyakashiInstance) {
    ayakashiInstance.registerAction("focus", async function(prop: IDomProp | string) {
        const myProp = this.prop(prop);
        if (!myProp) throw new Error("<focus> needs a valid prop");
        const matchCount = await myProp.trigger();
        if (matchCount === 0) throw new Error("<focus> needs a prop with at least 1 match");
        await this.scrollIntoView(myProp);
        const nodeId = await this.getNodeId(myProp);
        return this.__connection.client.DOM.focus({nodeId});
    });
}
