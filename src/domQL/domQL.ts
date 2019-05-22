import {tagWalk, domWalk} from "./walking";

export type Query = {
    where?: Where,
    limit?: number,
    skip?: number,
    order?: "asc" | "desc"
};

export type Where = Partial<SingleOperator | SetOperator>;

export type SingleOperator = {
    [key: string]: {
        [key: string]: string | string[] | RegExp | undefined,
/**
 * Match: The specified attribute on the left must equal the value on the right to have a match.
 * Learn more about domQL and eq at: https://ayakashi.io/docs/guide/querying-with-domql.html#eq
*/
        eq?: string,
/**
 * Match: The specified attribute on the left must contain (or match) the value on the right.
 * It can also accept a regex instead of a string.
 * Learn more about domQL and like at: https://ayakashi.io/docs/guide/querying-with-domql.html#like
*/
        like?: string | RegExp,
/**
 * Match: The specified attribute on the left must not contain (or match) the value on the right.
 * It can also accept a regex instead of a string.
 * Learn more about domQL and nlike at: https://ayakashi.io/docs/guide/querying-with-domql.html#nlike
*/
        nlike?: string | RegExp,
/**
 * The strict version of nlike.
 * Match: The specified attribute on the left must not contain (or match) the value on the right and
 * the attribute must exist.
 * It can also accept a regex instead of a string.
 * Learn more about domQL and $nlike at: https://ayakashi.io/docs/guide/querying-with-domql.html#nlike-strict
*/
        $nlike?: string | RegExp,
/**
 * Match: Matches any element that has the specified attribute equal to at least one value of the list on the right.
 * Learn more about domQL and in at: https://ayakashi.io/docs/guide/querying-with-domql.html#in
*/
        in?: string[],
/**
 * Match: Matches any element that has the specified attribute not equal to any value of the list on the right.
 * Learn more about domQL and nin at: https://ayakashi.io/docs/guide/querying-with-domql.html#nin
*/
        nin?: string[],
/**
 * The strict version of nin.
 * Match: Matches any element that has the specified attribute not equal to any value of the list on the right.
 * The attribute must exist.
 * Learn more about domQL and $nin at: https://ayakashi.io/docs/guide/querying-with-domql.html#nin-strict
*/
        $nin?: string[],
/**
 * Match: The specified attribute on the left must not equal the value on the right to have a match.
 * Learn more about domQL and neq at: https://ayakashi.io/docs/guide/querying-with-domql.html#neq
*/
        neq?: string,
/**
 * The strict version of neq.
 * Match: The specified attribute on the left must not equal the value on the right to have a match.
 * The attribute must exist.
 * Learn more about domQL and $neq at: https://ayakashi.io/docs/guide/querying-with-domql.html#neq-strict
*/
        $neq?: string
    }
};

export type SetOperator = {
    [key: string]: (SingleOperator | SetOperator)[] | undefined,
    and?: (SingleOperator | SetOperator)[],
    or?: (SingleOperator | SetOperator)[]
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
