import {tagWalk, domWalk} from "./walking";

export type Query = {
    where?: Where,
    limit?: number,
    skip?: number,
    order?: "asc" | "desc"
};

export type Where = {
    [key: string]: {
        [key: string]: {[key: string]: string | string[]} | Where[]
    } | Where[] | {[key: string]: string | string[]}
};

export type QueryOptions = {
    env?: Window,
    scope?: El | HTMLElement,
    recursive?: boolean
};

export type El = Element & HTMLElement & {[key: string]: string};

export function domQuery(query: Query, options: QueryOptions = {}) {
    let env;
    if (options.env) {
        env = options.env;
    } else if (typeof window !== "undefined") {
        env = window;
    } else {
        throw new Error("No suitable env found");
    }
    if (!query || typeof query !== "object") {
        throw new Error(
            "Query format is invalid. Learn more at https://ayakashi.io/docs/guide/querying-with-domql.html"
        );
    }
    if (query.where && typeof query.where !== "object") {
        throw new Error(
            "Query format is invalid. Learn more at https://ayakashi.io/docs/guide/querying-with-domql.html"
        );
    }
    if (query.where && typeof query.where === "object" && Object.keys(query.where).length === 0) {
        throw new Error(
            "Query format is invalid. Learn more at https://ayakashi.io/docs/guide/querying-with-domql.html"
        );
    }
    if (options.recursive === false) {
        return tagWalk(env, query, options.scope || env.document.body);
    } else {
        return domWalk(env, query, options.scope || env.document.body);
    }
}
