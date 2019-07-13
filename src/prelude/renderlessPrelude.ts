import {IAyakashiInstance, AyakashiPage} from "./prelude";
import {IConnection} from "../engine/createConnection";
import {attachMetaActions} from "./actions/meta";
import {attachQuery} from "./actions/select";
import {attachExtract} from "./actions/extract";
import {domQuery} from "../domQL/domQL";
import {attachCoreExtractors} from "../coreExtractors/extractors";
import {attachRetry} from "./actions/retry";
import {JSDOM} from "jsdom";

export interface IRenderlessAyakashiInstance {
    propRefs: IAyakashiInstance["propRefs"];
    extractors: IAyakashiInstance["extractors"];
/**
 * Given a prop name or prop object returns a prop object or null if the prop is not defined.
 * Can be used to get prop references from their name or to check if the prop is valid.
 * Learn more here: http://ayakashi.io/docs/going_deeper/anonymous-props-and-references.html
 * ```js
ayakashi.prop("myProp");
```
*/
    prop: IAyakashiInstance["prop"];
    evaluate: IAyakashiInstance["evaluate"];
    evaluateAsync: IAyakashiInstance["evaluateAsync"];
/**
 * Defines a new prop without using the domQL syntax.
 * Learn more here: http://ayakashi.io/docs/going_deeper/defining-props-without-domql.html
 * ```js
ayakashi.defineProp(function() {
    return this.document.getElementById("main");
}, "mainSection");
```
*/
    defineProp: IAyakashiInstance["defineProp"];
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
    registerExtractor: IAyakashiInstance["registerExtractor"];
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
    select: IAyakashiInstance["select"];
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
    selectFirst: IAyakashiInstance["selectFirst"];
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
    selectOne: IAyakashiInstance["selectOne"];
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
    selectLast: IAyakashiInstance["selectLast"];
/**
 * Extracts data from a prop.
 * Learn more here: http://ayakashi.io/docs/guide/data-extraction.html
 * ```js
ayakashi.select("myDivProp").where({id: {eq: "myDiv"}});
const result = await ayakashi.extract("myDivProp");
```
*/
    extract: IAyakashiInstance["extract"];
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
    retry: IAyakashiInstance["retry"];
/**
 * Yields extracted data from a scrapper to the next step of the pipeline.
 * Learn more about yield in this example: http://ayakashi.io/guide/building-a-complete-scraping-project.html
 * ```js
ayakashi.select("myDivProp").where({id: {eq: "myDiv"}});
const result = await ayakashi.extract("myDivProp");
await ayakashi.yield(result);
```
*/
    yield: IAyakashiInstance["yield"];
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
    yieldEach: IAyakashiInstance["yieldEach"];
/**
 * Recursively re-run the scrapper by yielding the extracted data to itself.
 * The data will be available in the input object.
*/
    recursiveYield: IAyakashiInstance["recursiveYield"];
    page: JSDOM;
/**
 * Fetches and loads a page in the renderlessScrapper's context.
 * A timeout can be specified (in ms) for slow pages (default 10s).
 * Use a timeout of 0 to disable the timeout.
 * ```js
await ayakashi.load("https://ayakashi.io");
```
*/
    load: (url: string, timeout?: number) => Promise<void>;
    attachDOM: (dom: JSDOM) => void;
    __connection: {
        release: () => Promise<void>;
    };
}
type PropTable = {
    [key: string]: {
        matches: HTMLElement[]
    }
};

//tslint:disable interface-name
declare module JSDOM {
    interface DOMWindow {
        ayakashi: AyakashiPage;
    }
}
//tslint:enable

export async function renderlessPrelude() {
    const ayakashiInstance: Partial<IRenderlessAyakashiInstance> = {
        propRefs: {},
        extractors: {}
    };
    //@ts-ignore
    const connection: IConnection = {};
    await attachMetaActions(<IRenderlessAyakashiInstance>ayakashiInstance, connection);
    await attachExtract(<IRenderlessAyakashiInstance>ayakashiInstance);
    attachCoreExtractors(<IRenderlessAyakashiInstance>ayakashiInstance);
    attachRetry(<IRenderlessAyakashiInstance>ayakashiInstance);

    (<IRenderlessAyakashiInstance>ayakashiInstance).__connection = {
        release: function() {
            return new Promise(resolve => {
                process.nextTick(() => {
                    if (ayakashiInstance.page && ayakashiInstance.page.window) {
                        ayakashiInstance.page.window.close();
                    }
                    if (global.gc) {
                        global.gc();
                    }
                    resolve();
                });
            });
        }
    };

    const propTable: PropTable = {};

    (<IRenderlessAyakashiInstance>ayakashiInstance).attachDOM = async function(dom) {
        if (this.page) {
            await this.__connection.release();
        }
        this.page = dom;
        this.page.window.ayakashi = {
            //@ts-ignore
            preloaders: {
                domQL: {
                    domQuery: domQuery
                },
                getNodeSelector: () => ""
            },
            extractors: {},
            propTable: propTable,
            paused: false,
            resume: () => undefined,
            document: dom.window.document,
            window: dom.window
        };
        attachQuery(<IRenderlessAyakashiInstance>ayakashiInstance, this.page.window);
    };

    (<IRenderlessAyakashiInstance>ayakashiInstance).evaluate = async function(fn, ...args) {
        //@ts-ignore
        return fn.call(ayakashiInstance.page.window.ayakashi, ...args);
    };

    (<IRenderlessAyakashiInstance>ayakashiInstance).evaluateAsync = async function(fn, ...args) {
        //@ts-ignore
        return fn.call(ayakashiInstance.page.window.ayakashi, ...args);
    };

    //@ts-ignore
    delete ayakashiInstance.pause;
    //@ts-ignore
    delete ayakashiInstance.registerAction;

    return <IRenderlessAyakashiInstance>ayakashiInstance;
}
