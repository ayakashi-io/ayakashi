import {isRegExp} from "util";

const isBrowser = new Function("try {return this===window;}catch(e){ return false;}");

export function replacer(_key: string, value: unknown) {
    if (value && typeof value === "function") {
        return {
            __ayakashi__isFunction__: true,
            __ayakashi__fn__: !isBrowser() ?
                Buffer.from(value.toString()).toString("base64") :
                btoa(value.toString())
        };
    } else if (value && isRegExp(value)) {
        return {
            __ayakashi__isRegex__: true,
            __ayakashi__source__: value.source,
            __ayakashi__flags__: value.flags
        };
    } else {
        return value;
    }
}

export function getReviver(ns: unknown) {
    return function reviver(
        _key: string,
        value: {
            __ayakashi__isFunction__?: boolean,
            __ayakashi__fn__?: string,
            __ayakashi__isRegex__?: boolean,
            __ayakashi__source__?: string,
            __ayakashi__flags__?: string
        }
    ) {
        if (value && typeof value === "object" && value.__ayakashi__isFunction__ && value.__ayakashi__fn__) {
            const fn = !isBrowser() ?
                Buffer.from(value.__ayakashi__fn__, "base64").toString("utf8") :
                atob(value.__ayakashi__fn__);
            return (new Function("results", `
                function getNs() {
                    try {
                        return ${ns};
                    } catch(_e) {
                        return {ayakashi: {}};
                    }
                }
                return (${fn}).call(getNs(), results);
            `));
        } else if (value && typeof value === "object" && value.__ayakashi__isRegex__) {
            return new RegExp(value.__ayakashi__source__ || "", value.__ayakashi__flags__);
        } else {
            return value;
        }
    };
}
