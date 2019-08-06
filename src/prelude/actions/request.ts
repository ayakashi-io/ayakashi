import {IAyakashiInstance} from "../prelude";
import {IRenderlessAyakashiInstance} from "../renderlessPrelude";
import {IApiAyakashiInstance} from "../apiPrelude";
import {CoreOptions, RequestAPI, RequiredUriUrl, Request} from "@ayakashi/request/core";

export interface IRequestActions {
    //tslint:disable no-any
    get: (uri: string, options?: CoreOptions) => Promise<any>;
    post: (uri: string, options?: CoreOptions) => Promise<any>;
    put: (uri: string, options?: CoreOptions) => Promise<any>;
    patch: (uri: string, options?: CoreOptions) => Promise<any>;
    delete: (uri: string, options?: CoreOptions) => Promise<any>;
    head: (uri: string, options?: CoreOptions) => Promise<any>;
    //tslint:enable no-any
}

export function attachRequest(
    ayakashiInstance: IAyakashiInstance | IRenderlessAyakashiInstance | IApiAyakashiInstance,
    requestInstance: RequestAPI<Request, CoreOptions, RequiredUriUrl>
) {
    const methods: ["get", "post", "put", "patch", "delete", "head"] = ["get", "post", "put", "patch", "delete", "head"];
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
}
