import {IAyakashiInstance} from "../prelude/prelude";
import {IDomProp} from "../prelude/query/query";

declare module "../prelude/prelude" {
    export interface IAyakashiInstance {
/**
 * Returns the x and y coordinates of a prop.
 * ```js
ayakashi.selectOne("myButton").where({class: {eq: "btn"}});
await ayakashi.getPosition("myButton");
```
*/
        getPosition: (prop: IDomProp | string) => Promise<{x: number, y: number}>;
/**
 * Returns the DOM nodeId of a prop. Mostly for internal use or to implement other actions.
 * ```js
ayakashi.selectOne("myButton").where({class: {eq: "btn"}});
await ayakashi.getNodeId("myButton");
```
*/
        getNodeId: (prop: IDomProp | string) => Promise<number>;
    }
}

export default function(ayakashiInstance: IAyakashiInstance) {
    ayakashiInstance.registerAction("getPosition", async function(prop: IDomProp | string) {
        const myProp = this.prop(prop);
        if (!myProp) throw new Error("<getPosition> needs a valid prop");
        const matchCount = await myProp.trigger();
        if (matchCount === 0) throw new Error("<getPosition> needs a prop with at least 1 match");
        const sizeAndPosition = await this.evaluate(function(scopedPropId: string) {
            const node = window.ayakashi.propTable[scopedPropId].matches[0];
            const clientRec = node.getBoundingClientRect();
            return {
                bottom: clientRec.bottom,
                top: clientRec.top,
                left: clientRec.left,
                right: clientRec.right,
                height: clientRec.height,
                width: clientRec.width
            };
        }, myProp.id);
        const x = sizeAndPosition.left + (sizeAndPosition.width / 2);
        const y = sizeAndPosition.top + (sizeAndPosition.height / 2);

        return {x, y};
    });

    ayakashiInstance.registerAction("getNodeId", async function(prop: IDomProp | string): Promise<number> {
        const myProp = this.prop(prop);
        if (!myProp) throw new Error("<getNodeId> needs a valid prop");
        const matchCount = await myProp.trigger();
        if (matchCount === 0) throw new Error("<getNodeId> needs a prop with at least 1 match");
        const document = await this.__connection.client.DOM.getDocument();
        let rootNode = document.root;
        if (rootNode.nodeName === "IFRAME" && rootNode.contentDocument) {
            rootNode = rootNode.contentDocument;
        }
        const selector = await this.evaluate<string>(function(scopedPropId: string) {
            const node = window.ayakashi.propTable[scopedPropId].matches[0];
            return window.ayakashi.preloaders.getNodeSelector(node);
        }, myProp.id);
        const result = await this.__connection.client.DOM.querySelector({
            nodeId: rootNode.nodeId,
            selector: selector
        });
        return result.nodeId;
    });
}
