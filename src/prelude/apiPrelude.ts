import {CoreOptions, RequestAPI, RequiredUriUrl, Request, Response} from "@ayakashi/request";
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
    __wrap: (
        requestInstance: RequestAPI<Request, CoreOptions, RequiredUriUrl>,
        methods: ["get", "post", "put", "patch", "delete", "head"]
    ) => void;
}

export function apiPrelude() {
    const ayakashiInstance: Partial<IApiAyakashiInstance> = {};
    attachRetry(<IApiAyakashiInstance>ayakashiInstance);

    ayakashiInstance.__wrap = function(requestInstance, methods) {
        methods.forEach(function(method) {
            ayakashiInstance[method] = async function(uri: string, options?: CoreOptions) {
                try {
                    const response: Response = await requestInstance[method](uri, options);
                    if (response.statusCode >= 400) {
                        throw new Error(response.body);
                    } else {
                        let body: object;
                        if (response.body) {
                            if (response.headers["content-type"] === "application/json") {
                                body = JSON.parse(response.body);
                                return body;
                            } else {
                                return response.body;
                            }
                        } else {
                            return null;
                        }
                    }
                } catch (e) {
                    throw e;
                }
            };
        });
    };

    return <IApiAyakashiInstance>ayakashiInstance;
}
