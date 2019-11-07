import {isRegExp} from "util";

export function replacer(_key: string, value: unknown) {
    if (value && typeof value === "function") {
        return {
            __ayakashi__isFunction__: true,
            __ayakashi__fn__: Buffer.from(value.toString()).toString("base64")
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

export function getReviver(ns: string) {
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
            const fn = atob(value.__ayakashi__fn__);
            return function(results: unknown) {
                const exec = new Function("results", `return (${fn}).call(this, results);`);
                //@ts-ignore
                return exec.call(window[ns], results);
            };
        } else if (value && typeof value === "object" && value.__ayakashi__isRegex__) {
            return new RegExp(value.__ayakashi__source__ || "", value.__ayakashi__flags__);
        } else {
            return value;
        }
    };
}
