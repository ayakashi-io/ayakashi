import {IAyakashiInstance} from "../prelude";
import {IRenderlessAyakashiInstance} from "../renderlessPrelude";
import {IApiAyakashiInstance} from "../apiPrelude";
import {Cookie} from "tough-cookie";
import {CookieJar} from "@ayakashi/request";
import {IConnection} from "../../engine/createConnection";
import {
    getAllCookiesFromRequestJar,
    toRequestCookies,
    getCookieUrl,
    toCookieString
} from "../../utils/cookieHelpers";
import {uniqBy} from "lodash";

type CookieFilter = {
    key?: string;
    domain?: string;
    path?: string;
    url?: string;
};

type SerializedCookie = {
    key: string;
    value: string;
    domain: string;
    path: string;
    creation: string;
    expires?: string;
    secure?: boolean;
    httpOnly?: boolean;
    hostOnly?: boolean;
    lastAccessed?: string;
};

type NewCookie = {
    key: string;
    value: string;
    domain: string;
    path: string;
    expires?: string;
    secure?: boolean;
    httpOnly?: boolean;
    hostOnly?: boolean;
};

export interface ICookieActions {
    getCookie: (filter?: CookieFilter) => Promise<SerializedCookie | null>;

    getCookies: (filter?: CookieFilter) => Promise<SerializedCookie[]>;

    setCookie: (cookie: NewCookie) => Promise<void>;

    setCookies: (cookies: NewCookie[]) => Promise<void>;
}

export function attachCookieActions(
    ayakashiInstance: IAyakashiInstance | IRenderlessAyakashiInstance | IApiAyakashiInstance,
    memJar: CookieJar,
    connection: IConnection | null,
    cookieSyncCallback: () => Promise<void>
) {

    ayakashiInstance.getCookie = async function(filter) {
        const cookies = await concatAllCookies();
        const theCookie = cookies.find(function(cookie) {
            return filterFn(cookie, filter);
        });
        if (theCookie) {
            return <SerializedCookie>theCookie.toJSON();
        } else {
            return null;
        }
    };

    ayakashiInstance.getCookies = async function(filter) {
        const cookies = await concatAllCookies();
        return cookies.filter(function(cookie) {
            return filterFn(cookie, filter);
        }).map(function(cookie) {
            return <SerializedCookie>cookie.toJSON();
        });
    };

    ayakashiInstance.setCookie = async function(cookie) {
        memJar.setCookie(toCookieString(<Cookie>cookie), getCookieUrl(<Cookie>cookie));
        await cookieSyncCallback();
    };

    ayakashiInstance.setCookies = async function(cookies) {
        for (const cookie of cookies) {
            memJar.setCookie(toCookieString(<Cookie>cookie), getCookieUrl(<Cookie>cookie));
        }
        await cookieSyncCallback();
    };

    async function concatAllCookies(): Promise<Cookie[]> {
        let requestCookies = getAllCookiesFromRequestJar(memJar);
        if (connection) {
            const {cookies} = await connection.client.Network.getCookies();
            requestCookies = requestCookies.concat(toRequestCookies(cookies));
            requestCookies = uniqBy(requestCookies, function(cookie) {
                return `${cookie.domain || ""}${cookie.path || ""}${cookie.key}`;
            });
        }
        return requestCookies;
    }

    function filterFn(cookie: Cookie, filter?: CookieFilter): boolean {
        if (!filter) return true;
        if (!filter.domain && !filter.key && !filter.path && !filter.url) return true;
        let accept = false;
        if (filter.key) {
            if (filter.key === cookie.key) {
                accept = true;
            } else {
                accept = false;
            }
        }
        if (filter.domain) {
            if (filter.domain === cookie.domain) {
                accept = true;
            } else {
                accept = false;
            }
        }
        if (filter.path) {
            if (filter.path === cookie.path) {
                accept = true;
            } else {
                accept = false;
            }
        }
        if (filter.url) {
            if (filter.url === getCookieUrl(cookie)) {
                accept = true;
            } else {
                accept = false;
            }
        }

        return accept;
    }
}
