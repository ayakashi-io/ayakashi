import {attachRetry, IRetryActions} from "./actions/retry";
import {IRequestActions} from "./actions/request";
import {IYieldActions} from "./actions/yield";

export interface IApiAyakashiInstance extends IRequestActions, IYieldActions, IRetryActions {}

export function apiPrelude() {
    const ayakashiInstance: Partial<IApiAyakashiInstance> = {};
    attachRetry(<IApiAyakashiInstance>ayakashiInstance);

    return <IApiAyakashiInstance>ayakashiInstance;
}
