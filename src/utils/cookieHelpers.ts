import {Cookie} from "tough-cookie";
import {CookieJar} from "@ayakashi/request/core";
import {ChromeCookie} from "../engine/createConnection";

export function getAllCookiesFromRequestJar(requestjar: CookieJar): Cookie[] {
    //@ts-ignore
    const memStore = requestjar._jar;
    const cookies: Cookie.Serialized[] = memStore.serializeSync().cookies;
    return cookies
        .map(function(cookie) {
            return Cookie.fromJSON(cookie);
        })
        .filter(function(cookie) {
            return cookie !== null;
        }) as Cookie[];
}

export function toChromeCookies(cookies: Cookie[]): ChromeCookie[] {
    return cookies.map(function(cookie) {
        return {
            name: cookie.key,
            value: cookie.value,
            url: getCookieUrl(cookie),
            domain: cookie.domain || undefined,
            path: cookie.path || undefined,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly
        };
    });
}

export function toRequestCookies(cookies: ChromeCookie[]): Cookie[] {
    return cookies
        .map(function(chromeCookie) {
            return {
                key: chromeCookie.name,
                value: chromeCookie.value,
                domain: chromeCookie.domain,
                path: chromeCookie.path,
                secure: chromeCookie.secure,
                httpOnly: chromeCookie.httpOnly,
                sameSite: chromeCookie.sameSite ? chromeCookie.sameSite.toLowerCase() : undefined
            };
        })
        .map(function(cookie) {
            return Cookie.fromJSON(cookie);
        })
        .filter(function(cookie) {
            return cookie !== null;
        }) as Cookie[];
}

export function getCookieUrl(cookie: Cookie): string {
    let url = "";
    if (cookie.secure) {
        url += "https://";
    } else {
        url += "http://";
    }
    url += cookie.domain;
    url += (cookie.path || "");

    return url;
}

export function toCookieString(cookie: Cookie): string {
    if (!cookie) return "";
    const cookieObject = Cookie.fromJSON(cookie);
    if (!cookieObject) return "";
    return cookieObject.cookieString();
}
