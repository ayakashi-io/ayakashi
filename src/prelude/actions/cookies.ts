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
/**
 * Get a single cookie that passes the filter.
 * Learn more here: https://ayakashi-io.github.io/docs/going_deeper/manipulating-cookies.html#manual-cookie-manipulation
 * ```js
const cookie = await ayakashi.getCookie({ //filter object
    key: "myKey" //optional,
    domain: "somepage.com" //optional,
    path: "/test" //optional,
    url: "https://somepage.com" //optional
});
```
*/
    getCookie: (filter?: CookieFilter) => Promise<SerializedCookie | null>;
/**
 * Get multiple cookies that pass the filter.
 * Learn more here: https://ayakashi-io.github.io/docs/going_deeper/manipulating-cookies.html#manual-cookie-manipulation
 * ```js
const cookies = await ayakashi.getCookies({ //filter object
    key: "myKey" //optional,
    domain: "somepage.com" //optional,
    path: "/test" //optional,
    url: "https://somepage.com" //optional
});
```
*/
    getCookies: (filter?: CookieFilter) => Promise<SerializedCookie[]>;
/**
 * Set a single cookie.
 * Learn more here: https://ayakashi-io.github.io/docs/going_deeper/manipulating-cookies.html#manual-cookie-manipulation
 * ```js
await ayakashi.setCookie({
    key: "myCookie",
    value: "test",
    domain: "somepage.com",
    path: "/",
    expires: "2029-10-25T17:29:23.375Z", //optional
    secure: true, //optional
    httpOnly: true, //optional
    hostOnly: false //optional
});
```
*/
    setCookie: (cookie: NewCookie) => Promise<void>;
/**
 * Set multiple cookies.
 * Learn more here: https://ayakashi-io.github.io/docs/going_deeper/manipulating-cookies.html#manual-cookie-manipulation
 * ```js
await ayakashi.setCookies([{
    key: "myCookie",
    value: "test",
    domain: "somepage.com",
    path: "/",
    expires: "2029-10-25T17:29:23.375Z", //optional
    secure: true, //optional
    httpOnly: true, //optional
    hostOnly: false //optional
}, {
    key: "myCookie2",
    value: "someValue",
    domain: "anotherpage.com",
    path: "/"
}]);
```
*/
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
