import {IConnection} from "../engine/createConnection";
import {attachMetaActions, IMetaActions} from "./actions/meta";
import {attachJoinActions, IJoinActions} from "./actions/join";
import {attachQuery, ISelectActions} from "./actions/select";
import {attachExtract, ExtractorFn, IExtractActions} from "./actions/extract";
import {IYieldActions} from "./actions/yield";
import {IRequestActions} from "./actions/request";
import {ICookieActions} from "./actions/cookies";
import {IDomProp} from "./query/query";
import {Query, QueryOptions} from "../domQL/domQL";
import {attachCoreExtractors} from "../coreExtractors/extractors";
import {attachRetry, IRetryActions} from "./actions/retry";

import clickActions from "../coreActions/click";
import focusActions from "../coreActions/focus";
import helperActions from "../coreActions/helpers";
import hoverActions from "../coreActions/hover";
import navigationActions from "../coreActions/navigation";
import optionsActions from "../coreActions/options";
import scrollingActions from "../coreActions/scroll";
import typingActions from "../coreActions/typing";
import waitingActions from "../coreActions/waiting";

export interface IAyakashiInstance extends IRetryActions, IRequestActions, IYieldActions, IExtractActions, ISelectActions, IMetaActions, ICookieActions, IJoinActions {
    propRefs: {
        [key: string]: IDomProp
    };
    __connection: IConnection;
    extractors: {[key: string]: () => Promise<void>};
}

export interface IPreloaders {
    domQL: {
        domQuery: (q: Query, opts?: QueryOptions) => HTMLElement[];
    };
    getNodeSelector: (el: HTMLElement) => string;
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
    preloaders: IPreloaders,
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
        attachMetaActions(<IAyakashiInstance>ayakashiInstance, connection);
        attachJoinActions(<IAyakashiInstance>ayakashiInstance);
        attachQuery(<IAyakashiInstance>ayakashiInstance);
        attachExtract(<IAyakashiInstance>ayakashiInstance);
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
