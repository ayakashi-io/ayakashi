import {createQuery, IDomProp} from "../query/query";
import {IAyakashiInstance} from "../prelude";
import {IRenderlessAyakashiInstance} from "../renderlessPrelude";

import debug from "debug";
import {DOMWindow} from "jsdom";
const d = debug("ayakashi:prelude:select");

export interface ISelectActions {
/**
 * Defines a new domQL prop with no match limit.
 * Learn more here: http://ayakashi.io/docs/guide/querying-with-domql.html
 * ```js
ayakashi
    .select("myProp")
    .where({
        id: {
            eq: "main"
        }
    })
```
*/
    select: (propId?: string) => IDomProp;
/**
 * Defines a new domQL prop with a limit of 1 match.
 * Learn more here: http://ayakashi.io/docs/guide/querying-with-domql.html#limit-skip-and-order
 * ```js
ayakashi
    .selectOne("myProp")
    .where({
        id: {
            eq: "main"
        }
    })
```
*/
    selectOne: (propId?: string) => IDomProp;
/**
 * Defines a new domQL prop with a limit of 1 match.
 * Learn more here: http://ayakashi.io/docs/guide/querying-with-domql.html#limit-skip-and-order
 * Alias of selectOne()
 * ```js
ayakashi
    .selectFirst("myProp")
    .where({
        id: {
            eq: "main"
        }
    })
```
*/
    selectFirst: (propId?: string) => IDomProp;
/**
 * Defines a new domQL prop with a limit of 1 match and a descending order.
 * Learn more here: http://ayakashi.io/docs/guide/querying-with-domql.html#limit-skip-and-order
 * ```js
ayakashi
    .selectLast("myProp")
    .where({
        id: {
            eq: "main"
        }
    })
```
*/
    selectLast: (propId?: string) => IDomProp;
}

export function attachQuery(ayakashiInstance: IAyakashiInstance | IRenderlessAyakashiInstance, window?: DOMWindow) {
    ayakashiInstance.select = function(propId?: string) {
        const query = createQuery(ayakashiInstance, {propId, window});
        ayakashiInstance.propRefs[query.id] = query;
        d(`registering prop: ${query.id}`);
        return query;
    };

    ayakashiInstance.selectOne = function(propId?: string) {
        const query = createQuery(ayakashiInstance, {propId, window});
        query.limit(1);
        ayakashiInstance.propRefs[query.id] = query;
        d(`registering prop: ${query.id}`);
        return query;
    };

    //alias of selectOne
    ayakashiInstance.selectFirst = ayakashiInstance.selectOne;

    ayakashiInstance.selectLast = function(propId?: string) {
        const query = createQuery(ayakashiInstance, {propId, window});
        query.limit(1);
        query.order("desc");
        ayakashiInstance.propRefs[query.id] = query;
        d(`registering prop: ${query.id}`);
        return query;
    };
}
