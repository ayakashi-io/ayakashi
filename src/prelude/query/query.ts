import {Where, Query} from "../../domQL/domQL";
import {IAyakashiInstance} from "../prelude";
import {IRenderlessAyakashiInstance} from "../renderlessPrelude";
import {getOpLog} from "../../opLog/opLog";
import {v4 as uuid} from "uuid";

import debug from "debug";
import {DOMWindow} from "jsdom";
const d = debug("ayakashi:prelude:query");

export interface IDomProp {
    $$prop: symbol;
    id: string;
    parent: IDomProp[];
/**
 * @ignore
*/
    __trackMissingChildren: boolean;
/**
 * Defines the query of a new prop.
 * Learn more here: https://ayakashi.io/docs/guide/querying-with-domql.html
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
    where: (q: Where) => this;
/**
 * Limits the prop matches.
 * Learn more here: https://ayakashi.io/docs/guide/querying-with-domql.html#limit-skip-and-order
 * ```js
ayakashi
    .select("myProp")
    .where({
        id: {
            eq: "main"
        }
    })
    .limit(2)
```
*/
    limit: (n: number) => this;
/**
 * Skips some of the prop matches.
 * Learn more here: https://ayakashi.io/docs/guide/querying-with-domql.html#limit-skip-and-order
 * ```js
ayakashi
    .select("myProp")
    .where({
        id: {
            eq: "main"
        }
    })
    .skip(1)
```
*/
    skip: (n: number) => this;
/**
 * Changes the order of how a prop's matches are retrieved.
 * Learn more here: https://ayakashi.io/docs/guide/querying-with-domql.html#limit-skip-and-order
 * ```js
ayakashi
    .select("myProp")
    .where({
        id: {
            eq: "main"
        }
    })
    .order("desc")
```
*/
    order: (ord: "asc" | "desc") => this;
/**
 * Limits the new prop's matches to child elements of an existing prop.
 * Learn more here: https://ayakashi.io/docs/guide/querying-with-domql.html#child-queries
 * ```js
ayakashi
    .select("myProp")
    .where({
        id: {
            eq: "main"
        }
    })
    .from("existingProp")
```
*/
    from: (propId: string | string[] | IDomProp | IDomProp[]) => this;
/**
 * Manually triggers a prop.
 * Learn more here: https://ayakashi.io/docs/going_deeper/re-evaluating-props.html
 * ```js
const myProp = ayakashi
    .select("myProp")
    .where({
        id: {
            eq: "main"
        }
    });
await myProp.trigger();
```
*/
    trigger: (triggerOptions?: {force?: boolean, showNoMatchesWarning?: boolean}) => Promise<number>;
/**
 * Makes the prop to ignore its cached elements on its next trigger and be re-evaluated.
 * Learn more here: https://ayakashi.io/docs/going_deeper/re-evaluating-props.html
 * ```js
const mainSection = ayakashi
    .select()
    .where({
        id: {
            eq: "main"
        }
    });

//use the mainSection prop
//...

//after some interaction (scroll, click etc) the page updates the #main element dynamically
//...

mainSection.update();

//use the mainSection prop again
//...
```
*/
    update: () => this;
/**
 * Defines a new child query with a limit of 1 match.
 * Learn more here: https://ayakashi.io/docs/guide/querying-with-domql.html#child-queries
 * ```js
ayakashi
    .select("myParentProp")
    .where({
        id: {
            eq: "main"
        }
    })
    .selectChild("repo")
            .where({
                href: {
                    like: "github.com"
                }
            })
```
*/
    selectChild: (childPropId?: string) => IDomProp;
/**
 * Defines a new child query with a limit of 1 match.
 * Learn more here: https://ayakashi.io/docs/guide/querying-with-domql.html#child-queries
 * Alias of selectChild()
 * ```js
ayakashi
    .select("myParentProp")
    .where({
        id: {
            eq: "main"
        }
    })
    .selectFirstChild("repo")
            .where({
                href: {
                    like: "github.com"
                }
            })
```
*/
    selectFirstChild: (childPropId?: string) => IDomProp;
/**
 * Defines a new child query with a limit of 1 match in and a descending ordering.
 * Learn more here: https://ayakashi.io/docs/guide/querying-with-domql.html#child-queries
 * Alias of selectChild()
 * ```js
ayakashi
    .select("myParentProp")
    .where({
        id: {
            eq: "main"
        }
    })
    .selectLastChild("repo")
            .where({
                href: {
                    like: "github.com"
                }
            })
```
*/
    selectLastChild: (childPropId?: string) => IDomProp;
/**
 * Defines a new child query with no match limit.
 * Learn more here: https://ayakashi.io/docs/guide/querying-with-domql.html#child-queries
 * Alias of selectChild()
 * ```js
ayakashi
    .select("myParentProp")
    .where({
        id: {
            eq: "main"
        }
    })
    .selectChildren("repo")
            .where({
                href: {
                    like: "github.com"
                }
            })
```
*/
    selectChildren: (childPropId?: string) => IDomProp;
/**
 * Checks if a prop has any matches. The prop will be re-evaluated every time this runs.
 * Useful for dynamic pagination loops.
 * ```js
const next = ayakashi
    .select("next")
    .where({
        id: {
            eq: "nextPage"
        }
    })
while (await next.hasMatches()) {
    // do work in the current page...
    // go to the next page
    await ayakashi.navigationClick("next");
}
```
*/
    hasMatches: () => Promise<boolean>;
/**
 * Adds a child match placeholder if a child does not exist in a collection of parents.
 * Can be used to preserve proper ordering when extracting children that might sometimes not exist.
 * Learn more here: https://ayakashi.io/docs/guide/querying-with-domql.html#tracking-missing-children
 * ```js
// for the following html
// <div class="container"><a href="http://example.com">link1</a></div>
// <div class="container">I don't have a link</div>
// <div class="container"><a href="http://example2.com">link2</a></div>
ayakashi
    .select("parentProp")
    .where({
        class: {
            eq: "container"
        }
    })
    .trackMissingChildren()
    .selectChild("childProp")
        .where({
            tagName: {
                eq: "A"
            }
        });
const result = await ayakashiInstance.extract("childProp");
// When we extract the childProps, we will get the following (notice the empty childProp):
// result => [{childProp: "link1"}, {childProp: ""}, {childProp: "link2"}]
// if we didn't use trackMissingChildren(), we would have gotten:
// result => [{childProp: "link1"}, {childProp: "link2"}]
```
*/
    trackMissingChildren: () => IDomProp;
}
export function createQuery(
    ayakashiInstance: IAyakashiInstance | IRenderlessAyakashiInstance,
    opts: {
        propId?: string,
        triggerFn?: () => Promise<number>,
        window?: DOMWindow
    }
): IDomProp {
    const opLog = getOpLog();
    const query: Partial<Query> = {};
    let triggered = false;
    const window = opts.window;
    return {
        $$prop: Symbol("AyakashiProp"),
        id: (opts && opts.propId) || `prop_${uuid()}`,
        parent: [],
        __trackMissingChildren: false,
        where: function(q) {
            query.where = q;
            return this;
        },
        limit: function(n) {
            query.limit = n;
            return this;
        },
        skip: function(n) {
            query.skip = n;
            return this;
        },
        order: function(ord) {
            if (ord === "asc" || ord === "desc") {
                query.order = ord;
            }
            return this;
        },
        from: function(fromPropId) {
            if (Array.isArray(fromPropId)) {
                //@ts-ignore
                fromPropId.forEach(id => {
                    const p = ayakashiInstance.prop(id);
                    if (!p) {
                        throw new Error(`Uknown parent prop : ${id}`);
                    }
                    this.parent.push(p);
                });
            } else {
                const p = ayakashiInstance.prop(fromPropId);
                if (!p) {
                    throw new Error(`Uknown parent prop : ${fromPropId}`);
                }
                this.parent.push(p);
            }
            return this;
        },
        trigger: async function(triggerOptions) {
            if (!triggerOptions || triggerOptions.force !== true) {
                if (triggered) {
                    const propMatches = await ayakashiInstance.evaluate<number>(function(scopedPropId: string) {
                        if (this.propTable[scopedPropId] &&
                            this.propTable[scopedPropId].matches) {
                                return this.propTable[scopedPropId].matches.length;
                        } else {
                            return 0;
                        }
                    }, this.id);
                    if (propMatches === 0 &&
                        (!triggerOptions || (triggerOptions && triggerOptions.showNoMatchesWarning))) {
                        opLog.warn(`prop: ${this.id} has no matches`);
                    }
                    return propMatches;
                }
            }
            triggered = true;
            if (this.parent && this.parent.length > 0) {
                const parentsWithMatch = (await Promise.all(this.parent.map(p => p.trigger()))).filter(c => c > 0);
                if (parentsWithMatch.length === 0) {
                    opLog.warn(`prop: ${this.id} has no parent matches`);
                    return 0;
                }
            }
            d(`triggering prop: ${this.id}`);
            if (opts && opts.triggerFn) {
                const propMatches = await opts.triggerFn();
                if (propMatches === 0 && (!triggerOptions || (triggerOptions && triggerOptions.showNoMatchesWarning))) {
                    opLog.warn(`prop: ${this.id} has no matches`);
                }
                return propMatches;
            } else {
                const propMatches = await ayakashiInstance.evaluate<number>(function(
                    scopedQuery: Query,
                    scopedId: string,
                    scopedParentIds: {parentId: string, trackMissingChildren: boolean}[]
                ) {
                    let matches: HTMLElement[] = [];
                    if (scopedParentIds.length > 0) {
                        scopedParentIds.forEach(({parentId, trackMissingChildren}) => {
                            const parentMatches = this.propTable[parentId].matches;
                            if (parentMatches && parentMatches.length > 0) {
                                parentMatches.forEach((parentEl) => {
                                    let childrenMatches = Array.from(
                                        this.preloaders.domQL.domQuery(scopedQuery, {
                                            scope: parentEl,
                                            env: window
                                        })
                                    );
                                    if (childrenMatches.length === 0 && trackMissingChildren) {
                                        childrenMatches = [
                                            window ?
                                            window.document.createElement("void") :
                                            document.createElement("void")
                                        ];
                                    }
                                    matches = matches.concat(childrenMatches);
                                });
                            }
                        });
                    } else {
                        matches = Array.from(this.preloaders.domQL.domQuery(scopedQuery, {env: window}));
                    }
                    this.propTable[scopedId] = {
                        matches: matches
                    };
                    return matches.length;
                },
                query,
                this.id,
                this.parent.map(p => ({parentId: p.id, trackMissingChildren: p.__trackMissingChildren})));
                if (propMatches === 0 && (!triggerOptions || (triggerOptions && triggerOptions.showNoMatchesWarning))) {
                    opLog.warn(`prop: ${this.id} has no matches`);
                }
                return propMatches;
            }
        },
        hasMatches: async function() {
            await this.trigger({force: true, showNoMatchesWarning: false});
            const matches = await ayakashiInstance.evaluate<number>(function(scopedPropId: string) {
                return (
                    this.propTable[scopedPropId] &&
                    this.propTable[scopedPropId].matches &&
                    this.propTable[scopedPropId].matches.length) || 0;
            }, this.id);
            return matches > 0;
        },
        update: function() {
            triggered = false;
            return this;
        },
        selectChildren: function(childPropId) {
            const childQuery = createQuery(ayakashiInstance, {propId: childPropId, window: window}).from(this);
            ayakashiInstance.propRefs[childQuery.id] = childQuery;
            d(`registering prop: ${childQuery.id}`);
            return childQuery;
        },
        selectChild: function(childPropId) {
            const childQuery = createQuery(ayakashiInstance, {propId: childPropId, window: window}).from(this);
            childQuery.limit(1);
            ayakashiInstance.propRefs[childQuery.id] = childQuery;
            d(`registering prop: ${childQuery.id}`);
            return childQuery;
        },
        selectFirstChild: function(childPropId) { //alias of selectChild
            return this.selectChild(childPropId);
        },
        selectLastChild: function(childPropId) {
            const childQuery = createQuery(ayakashiInstance, {propId: childPropId, window: window}).from(this);
            childQuery.limit(1);
            childQuery.order("desc");
            ayakashiInstance.propRefs[childQuery.id] = childQuery;
            d(`registering prop: ${childQuery.id}`);
            return childQuery;
        },
        trackMissingChildren: function() {
            this.__trackMissingChildren = true;
            return this;
        }
    };
}
