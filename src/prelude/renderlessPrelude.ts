import {IAyakashiInstance, AyakashiPage} from "./prelude";
import {IConnection} from "../engine/createConnection";
import {attachMetaActions, IMetaActions} from "./actions/meta";
import {attachQuery, ISelectActions} from "./actions/select";
import {attachExtract, IExtractActions} from "./actions/extract";
import {domQuery} from "../domQL/domQL";
import {attachCoreExtractors} from "../coreExtractors/extractors";
import {attachRetry, IRetryActions} from "./actions/retry";
import {IRequestActions} from "./actions/request";
import {IYieldActions} from "./actions/yield";
import {JSDOM} from "jsdom";

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

type MetaActionsNoPause = Omit<IMetaActions, "pause">;
type MetaActionsNoRegisterAction = Omit<MetaActionsNoPause, "registerAction">;
export interface IRenderlessAyakashiInstance extends IRetryActions, IRequestActions, IYieldActions, IExtractActions, ISelectActions, MetaActionsNoRegisterAction {
    propRefs: IAyakashiInstance["propRefs"];
    extractors: IAyakashiInstance["extractors"];
    page: JSDOM;
/**
 * Fetches and loads a page in the renderlessScraper's context.
 * A timeout can be specified (in ms) for slow pages (default 10s).
 * Use a timeout of 0 to disable the timeout.
 * ```js
await ayakashi.load("https://ayakashi.io");
```
*/
    load: (this: IRenderlessAyakashiInstance, url: string, timeout?: number) => Promise<void>;
/**
 * Loads an html fragment in the renderlessScraper's context.
 * ```js
await ayakashi.loadHtml("<body>hi</body>");
```
*/
    loadHtml: (this: IRenderlessAyakashiInstance, html: string) => Promise<void>;
    __attachDOM: (this: IRenderlessAyakashiInstance, dom: JSDOM) => Promise<void>;
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

    //define head and body props for convenience
    (<IAyakashiInstance>ayakashiInstance).defineProp(function() {
        return this.document.body;
    }, "body");
    (<IAyakashiInstance>ayakashiInstance).defineProp(function() {
        return this.document.head;
    }, "head");

    //@ts-ignore
    delete ayakashiInstance.pause;
    //@ts-ignore
    delete ayakashiInstance.registerAction;

    return <IRenderlessAyakashiInstance>ayakashiInstance;
}
