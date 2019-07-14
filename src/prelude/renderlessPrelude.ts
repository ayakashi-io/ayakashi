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
    prop: IAyakashiInstance["prop"];
    evaluate: IAyakashiInstance["evaluate"];
    evaluateAsync: IAyakashiInstance["evaluateAsync"];
    defineProp: IAyakashiInstance["defineProp"];
    registerExtractor: IAyakashiInstance["registerExtractor"];
    select: IAyakashiInstance["select"];
    selectFirst: IAyakashiInstance["selectFirst"];
    selectOne: IAyakashiInstance["selectOne"];
    selectLast: IAyakashiInstance["selectLast"];
    extract: IAyakashiInstance["extract"];
    retry: IAyakashiInstance["retry"];
    yield: IAyakashiInstance["yield"];
    yieldEach: IAyakashiInstance["yieldEach"];
    recursiveYield: IAyakashiInstance["recursiveYield"];
    recursiveYieldEach: IAyakashiInstance["recursiveYieldEach"];
    page: JSDOM;
/**
 * Fetches and loads a page in the renderlessScrapper's context.
 * A timeout can be specified (in ms) for slow pages (default 10s).
 * Use a timeout of 0 to disable the timeout.
 * ```js
await ayakashi.load("https://ayakashi.io");
```
*/
    load: (this: IRenderlessAyakashiInstance, url: string, timeout?: number) => Promise<void>;
    __attachDOM: (this: IRenderlessAyakashiInstance, dom: JSDOM) => void;
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

    (<IRenderlessAyakashiInstance>ayakashiInstance).__attachDOM = async function(dom) {
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
