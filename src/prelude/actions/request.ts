import {IAyakashiInstance} from "../prelude";
import {IRenderlessAyakashiInstance} from "../renderlessPrelude";
import {IApiAyakashiInstance} from "../apiPrelude";
import {CoreOptions, RequestAPI, RequiredUriUrl, Request} from "@ayakashi/request/core";

export interface IRequestActions {
    //tslint:disable no-any
/**
 * Issues a GET Http request.
 * You can learn more about requests on the API scrapers section: https://ayakashi.io/docs/guide/api-scrapers.html
*/
    get: (uri: string, options?: CoreOptions) => Promise<any>;
/**
 * Issues a POST Http request.
 * You can learn more about requests on the API scrapers section: https://ayakashi.io/docs/guide/api-scrapers.html
*/
    post: (uri: string, options?: CoreOptions) => Promise<any>;
/**
 * Issues a PUT Http request.
 * You can learn more about requests on the API scrapers section: https://ayakashi.io/docs/guide/api-scrapers.html
*/
    put: (uri: string, options?: CoreOptions) => Promise<any>;
/**
 * Issues a PATCH Http request.
 * You can learn more about requests on the API scrapers section: https://ayakashi.io/docs/guide/api-scrapers.html
*/
    patch: (uri: string, options?: CoreOptions) => Promise<any>;
/**
 * Issues a DELETE Http request.
 * You can learn more about requests on the API scrapers section: https://ayakashi.io/docs/guide/api-scrapers.html
*/
    delete: (uri: string, options?: CoreOptions) => Promise<any>;
/**
 * Issues a HEAD Http request.
 * You can learn more about requests on the API scrapers section: https://ayakashi.io/docs/guide/api-scrapers.html
*/
    head: (uri: string, options?: CoreOptions) => Promise<any>;
    //tslint:enable no-any
}

export function attachRequest(
    ayakashiInstance: IAyakashiInstance | IRenderlessAyakashiInstance | IApiAyakashiInstance,
    requestInstance: RequestAPI<Request, CoreOptions, RequiredUriUrl>,
    cookieSyncCallback: () => Promise<void>
) {
    const methods: ["get", "post", "put", "patch", "delete", "head"] = ["get", "post", "put", "patch", "delete", "head"];
    methods.forEach(function(method) {
        ayakashiInstance[method] = function(uri: string, options?: CoreOptions) {
            return new Promise(function(resolve, reject) {
                requestInstance[method](uri, options, async function(err, response, body) {
                    if (err) {
                        return reject(err);
                    }
                    if (response.statusCode >= 400) {
                        return reject(new Error(`${response.statusCode} - ${truncate(String(body))}`));
                    }
                    await cookieSyncCallback();
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

function truncate(str: string) {
    const buff = Buffer.from(str);
    if (buff.byteLength > 80) {
        return buff.slice(0, 80).toString() + "...";
    } else {
        return buff.toString();
    }
}
