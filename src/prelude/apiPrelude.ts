import {CoreOptions, RequestAPI, RequiredUriUrl, Request} from "@ayakashi/request/core";
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
            ayakashiInstance[method] = function(uri: string, options?: CoreOptions) {
                return new Promise(function(resolve, reject) {
                    requestInstance[method](uri, options, function(err, response, body) {
                        if (err) {
                            return reject(err);
                        }
                        if (response.statusCode >= 400) {
                            return reject(new Error(`${response.statusCode} - ${body}`));
                        }
                        if (body) {
                            if (response.headers["content-type"] === "application/json" && typeof body === "string") {
                                const parsedBody = JSON.parse(body);
                                resolve(parsedBody);
                            } else {
                                resolve(body);
                            }
                        } else {
                            resolve();
                        }
                    });
                });
            };
        });
    };

    return <IApiAyakashiInstance>ayakashiInstance;
}
