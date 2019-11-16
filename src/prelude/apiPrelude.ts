import {attachRetry, IRetryActions} from "./actions/retry";
import {IRequestActions} from "./actions/request";
import {IYieldActions} from "./actions/yield";
import {ICookieActions} from "./actions/cookies";
import {attachJoinActions, IJoinActions} from "./actions/join";

export interface IApiAyakashiInstance extends IRequestActions, IYieldActions, IRetryActions, ICookieActions, IJoinActions {}

export function apiPrelude() {
    const ayakashiInstance: Partial<IApiAyakashiInstance> = {};
    attachRetry(<IApiAyakashiInstance>ayakashiInstance);
    attachJoinActions(<IApiAyakashiInstance>ayakashiInstance);

    return <IApiAyakashiInstance>ayakashiInstance;
}
