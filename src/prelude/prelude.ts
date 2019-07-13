import {IConnection} from "../engine/createConnection";
import {attachMetaActions} from "./actions/meta";
import {attachQuery} from "./actions/select";
import {attachExtract, Extractable, ExtractorFn} from "./actions/extract";
import {IDomProp} from "./query/query";
import {Query, QueryOptions} from "../domQL/domQL";
import {attachCoreExtractors} from "../coreExtractors/extractors";
import {attachRetry} from "./actions/retry";

import clickActions from "../coreActions/click";
import focusActions from "../coreActions/focus";
import helperActions from "../coreActions/helpers";
import hoverActions from "../coreActions/hover";
import navigationActions from "../coreActions/navigation";
import optionsActions from "../coreActions/options";
import scrollingActions from "../coreActions/scroll";
import typingActions from "../coreActions/typing";
import waitingActions from "../coreActions/waiting";

export interface IAyakashiInstance {
    propRefs: {
        [key: string]: IDomProp
    };
    __connection: IConnection;
    extractors: {[key: string]: () => Promise<void>};
/**
 * Given a prop name or prop object returns a prop object or null if the prop is not defined.
 * Can be used to get prop references from their name or to check if the prop is valid.
 * Learn more here: http://ayakashi.io/docs/going_deeper/anonymous-props-and-references.html
 * ```js
ayakashi.prop("myProp");
```
*/
    prop: (propId: IDomProp | string) => IDomProp | null;
    //tslint:disable no-any
/**
 * Evaluates a javascript function in the current page.
 * Learn more here: http://ayakashi.io/docs/going_deeper/evaluating-javascript-expressions.html
 * ```js
const title = await ayakashi.evaluate(function() {
    return document.title;
});
```
*/
    evaluate: <T>(fn: (this: Window["ayakashi"], ...args: any[]) => T, ...args: any[]) => Promise<T>;
/**
 * Evaluates an asynchronous javascript function in the current page.
 * Learn more here: http://ayakashi.io/docs/going_deeper/evaluating-javascript-expressions.html
 * ```js
await ayakashi.evaluateAsync(function() {
    return new Promise(function(resolve) {
        setTimeout(function() {
            resolve();
        }, 1000);
    });
});
```
*/
    evaluateAsync: <T>(fn: (this: Window["ayakashi"], ...args: any[]) => Promise<T>, ...args: any[]) => Promise<T>;
    //tslint:enable no-any
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
/**
 * Defines a new prop without using the domQL syntax.
 * Learn more here: http://ayakashi.io/docs/going_deeper/defining-props-without-domql.html
 * ```js
ayakashi.defineProp(function() {
    return this.document.getElementById("main");
}, "mainSection");
```
*/
    defineProp: (fn: (this: Window["ayakashi"]) => HTMLElement | HTMLElement[] | NodeList, propId?: string) => IDomProp;
    //tslint:disable no-any
/**
 * Registers a new action and makes it available in the ayakashi instance.
 * Learn more here: http://ayakashi.io/docs/advanced/creating-your-own-actions.html
 * ```js
ayakashi.registerAction("myAction", async function(prop) {
    console.log("running myAction");
});
```
*/
    registerAction: <T>(name: string, fn: (this: IAyakashiInstance, ...args: any[]) => Promise<T>) => void;
/**
 * Extracts data from a prop.
 * Learn more here: http://ayakashi.io/docs/guide/data-extraction.html
 * ```js
ayakashi.select("myDivProp").where({id: {eq: "myDiv"}});
const result = await ayakashi.extract("myDivProp");
```
*/
    extract: (
        propId: string | IDomProp,
        extractable?: Extractable
    ) => any;
    //tslint:enable no-any
/**
 * Registers a new extractor and makes it available in the extract() method.
 * Learn more here: http://ayakashi.io/docs/advanced/creating-your-own-extractors.html
 * ```js
ayakashi.registerExtractor("id", function() {
    return {
        extract: function(element) {
            return element.id;
        },
        isValid: function(result) {
            return !!result;
        },
        useDefault: function() {
            return "no-id-found";
        }
    };
});
```
*/
    registerExtractor: (extractorName: string, extractorFn: ExtractorFn, dependsOn?: string[]) => void;
/**
 * Pauses the execution of the scrapper.
 * Learn more here: http://ayakashi.io/docs/guide/debugging.html
 * ```js
await ayakashi.pause();
```
*/
    pause: () => Promise<void>;
/**
 * Yields extracted data from a scrapper to the next step of the pipeline.
 * Learn more about yield in this example: http://ayakashi.io/guide/building-a-complete-scraping-project.html
 * ```js
ayakashi.select("myDivProp").where({id: {eq: "myDiv"}});
const result = await ayakashi.extract("myDivProp");
await ayakashi.yield(result);
```
*/
    yield: (extracted: object | Promise<object>) => Promise<void>;
/**
 * Yields multiple extractions individually in a single (atomic) operation.
 * The next step of the pipeline will run for each extraction.
 * Learn more about yield in this example: http://ayakashi.io/guide/building-a-complete-scraping-project.html
 * ```js
await ayakashi.yieldEach(extractedLinks);
//is kinda like this
for (const link of extractedLinks) {
    await ayakashi.yield(link);
}
//but ensures the yields are performed as a single unit
```
*/
    yieldEach: (extracted: object[] | Promise<object[]>) => Promise<void>;
/**
 * Recursively re-run the scrapper by yielding the extracted data to itself.
 * The data will be available in the input object.
*/
    recursiveYield: (extracted: object | Promise<object>) => Promise<void>;
/**
 * Retry an async operation.
 * Default is 10 retries.
 * If the operation returns a result, that result will also be returned by retry.
 * Learn more about retries at: https://ayakashi.io/docs/going_deeper/automatic_retries.html
 * ```js
await ayakashi.retry(async function() {
    await ayakashi.goTo("https://github.com/ayakashi-io/ayakashi");
}, 5);
```
*/
    retry: <T>(task: (currentRetry: number) => Promise<T>, retries?: number) => Promise<T>;
}

export type AyakashiPage = {
    propTable: {
        [key: string]: {
            matches: HTMLElement[]
        }
    },
    extractors: {
        [key: string]: ExtractorFn
    },
    preloaders: {
        domQL: {
            domQuery: (q: Query, opts?: QueryOptions) => HTMLElement[]
        },
        getNodeSelector: (el: HTMLElement) => string;
    },
    paused: boolean,
    resume: () => void;
    document: Document;
    window: Window;
};

//tslint:disable interface-name
declare global {
    interface Window {
        ayakashi: AyakashiPage;
    }
}
//tslint:enable

export async function prelude(connection: IConnection): Promise<IAyakashiInstance> {
    const ayakashiInstance: Partial<IAyakashiInstance> = {
        propRefs: {},
        extractors: {},
        __connection: connection
    };
    try {
        await connection.useNameSpace("ayakashi");
        await attachMetaActions(<IAyakashiInstance>ayakashiInstance, connection);
        await attachQuery(<IAyakashiInstance>ayakashiInstance);
        await attachExtract(<IAyakashiInstance>ayakashiInstance);
        attachCoreExtractors(<IAyakashiInstance>ayakashiInstance);
        attachCoreActions(<IAyakashiInstance>ayakashiInstance);
        attachRetry(<IAyakashiInstance>ayakashiInstance);
        //define head and body props for convenience
        (<IAyakashiInstance>ayakashiInstance).defineProp(function() {
            return document.body;
        }, "body");
        (<IAyakashiInstance>ayakashiInstance).defineProp(function() {
            return document.head;
        }, "head");

        return <IAyakashiInstance>ayakashiInstance;
    } catch (e) {
        console.error(e);
        throw e;
    }
}

function attachCoreActions(ayakashiInstance: IAyakashiInstance) {
    clickActions(ayakashiInstance);
    focusActions(ayakashiInstance);
    helperActions(ayakashiInstance);
    hoverActions(ayakashiInstance);
    navigationActions(ayakashiInstance);
    optionsActions(ayakashiInstance);
    scrollingActions(ayakashiInstance);
    typingActions(ayakashiInstance);
    waitingActions(ayakashiInstance);
}
