import {IAyakashiInstance} from "../prelude/prelude";
import {IDomProp} from "../prelude/query/query";

declare module "../prelude/prelude" {
    export interface IAyakashiInstance {
/**
 * Hovers over a prop.
 * ```js
ayakashi.selectOne("moreInfo").where({id: {eq: "info"}});
await ayakashi.hover("moreInfo");
```
*/
        hover: (prop: IDomProp | string) => Promise<void>;
    }
}

export default function(ayakashiInstance: IAyakashiInstance) {
    ayakashiInstance.registerAction("hover", async function(prop: IDomProp | string) {
        const myProp = this.prop(prop);
        if (!myProp) throw new Error("<hover> needs a valid prop");
        const matchCount = await myProp.trigger();
        if (matchCount === 0) throw new Error("<hover> needs a prop with at least 1 match");
        await this.scrollIntoView(myProp);
        const pos = await this.getPosition(myProp);
        return this.__connection.mouse.move(pos.x, pos.y);
    });
}
