import {IAyakashiInstance} from "./prelude";
import {IConnection} from "../engine/createConnection";
import {attachMetaActions} from "./actions/meta";
import {attachQuery} from "./actions/select";
import {attachExtract, ExtractorFn} from "./actions/extract";
import {Query, QueryOptions, domQuery} from "../domQL/domQL";
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
    page: JSDOM;
    load: (url: string, timeout?: number) => Promise<void>;
    attachDOM: (dom: JSDOM) => void;
}
type PropTable = {
    [key: string]: {
        matches: HTMLElement[]
    }
};

//tslint:disable interface-name
declare module JSDOM {
    interface DOMWindow {
        ayakashi: {
            propTable: PropTable,
            extractors: {
                [key: string]: ExtractorFn
            },
            preloaders: {
                domQL: {
                    domQuery: (q: Query, opts?: QueryOptions) => HTMLElement[]
                }
            }
        };
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

    const propTable: PropTable = {};

    (<IRenderlessAyakashiInstance>ayakashiInstance).attachDOM = async function(dom) {
        this.page = dom;
        this.page.window.ayakashi = {
            //@ts-ignore
            preloaders: {
                domQL: {
                    domQuery: domQuery
                }
            },
            extractors: {},
            propTable: propTable
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
