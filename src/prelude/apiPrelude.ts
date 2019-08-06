import {CoreOptions} from "@ayakashi/request/core";
import {IAyakashiInstance} from "./prelude";
import {attachRetry} from "./actions/retry";

export interface IApiAyakashiInstance {
    retry: IAyakashiInstance["retry"];
    yield: IAyakashiInstance["yield"];
    yieldEach: IAyakashiInstance["yieldEach"];
    recursiveYield: IAyakashiInstance["recursiveYield"];
    recursiveYieldEach: IAyakashiInstance["recursiveYieldEach"];
    //tslint:disable no-any
    get: (uri: string, options?: CoreOptions) => Promise<any>;
    post: (uri: string, options?: CoreOptions) => Promise<any>;
    put: (uri: string, options?: CoreOptions) => Promise<any>;
    patch: (uri: string, options?: CoreOptions) => Promise<any>;
    delete: (uri: string, options?: CoreOptions) => Promise<any>;
    head: (uri: string, options?: CoreOptions) => Promise<any>;
    //tslint:enable no-any
}

export function apiPrelude() {
    const ayakashiInstance: Partial<IApiAyakashiInstance> = {};
    attachRetry(<IApiAyakashiInstance>ayakashiInstance);

    return <IApiAyakashiInstance>ayakashiInstance;
}
