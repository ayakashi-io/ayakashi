import {operators} from "./operators";
import {Query, El} from "./domQL";

export type NodeQuery = () => string | string[] | null;

const VALID_OPERATORS = ["and", "or", "eq", "neq", "$neq", "like", "nlike", "$nlike", "in", "nin", "$nin"];

export function runQuery(env: Window, query: Query, el: El): boolean {
    query.where = query.where || {};
    const top = Object.keys(query.where)[0];
    if (Array.isArray(query.where[top])) {
        const reductionTree: {[key: string]: []} = {};
        reductionTree[top] = [];
        if (top !== "and" && top !== "or") {
            throw new Error(
                `Invalid operator: ${top}. Learn more at https://ayakashi.io/docs/guide/querying-with-domql.html`
            );
        }
        (<[]>query.where[top]).forEach(member => {
            const key = Object.keys(member)[0];
            expandQuery(env, member, key, reductionTree, el, top);
        });
        return operators[top](...reductionTree[top])();
    } else {
        const attribute = Object.keys(query.where)[0];
        const op = Object.keys(query.where[attribute])[0];
        //@ts-ignore
        const expected = query.where[attribute][op];
        throwIfInvalidExpected(expected);
        if (!operators[op]) {
            throw new Error(
                `Invalid operator: ${op}. Learn more at https://ayakashi.io/docs/guide/querying-with-domql.html`
            );
        }
        //@ts-ignore
        return operators[op](createNodeQuery(env, el, attribute), expected)();
    }
}

function createNodeQuery(env: Window, el: El, attribute: string): NodeQuery {
    return function() {
        if ((attribute === "className" || attribute === "class")) {
            if (!el.classList || el.classList.length === 0) {
                return null;
            } else {
                return Array.from(el.classList).filter(name => !!name);
            }
        } else if (attribute === "dataKey") {
            if (!el.dataset || Object.keys(el.dataset).length === 0) {
                return null;
            } else {
                return Object.keys(el.dataset).filter(dataKey => !!dataKey);
            }
        } else if (attribute === "dataValue") {
            if (!el.dataset || Object.keys(el.dataset).length === 0) {
                return null;
            } else {
                return <string[]>Object.keys(el.dataset).map(k => el.dataset[k]).filter(dataValue => !!dataValue);
            }
        } else if (attribute.indexOf("style-") > -1) {
            if (el.nodeName !== "#text") {
                const styleProp = attribute.replace("style-", "");
                const compStyles = env.getComputedStyle(el);
                const val = compStyles.getPropertyValue(styleProp);
                if (val) {
                    return val;
                } else {
                    return null;
                }
            } else {
                return null;
            }
        } else {
            try {
                if (el[attribute]) {
                    return el[attribute];
                } else if (el.getAttribute(attribute)) {
                    return el.getAttribute(attribute);
                } else {
                    return null;
                }
            } catch (_e) {
                return null;
            }
        }
    };
}

function expandQuery(
    env: Window,
    member: {[key: string]: object | []},
    key: string,
    //@ts-ignore
    reductionTree,
    el: El,
    top: string
) {
    if (Array.isArray(member[key])) {
        const newTop = key;
        if (newTop !== "and" && newTop !== "or") {
            throw new Error(
                `Invalid operator: ${newTop}. Learn more at https://ayakashi.io/docs/guide/querying-with-domql.html`
            );
        }
        (<[]>member[key]).forEach(submember => {
            const subkey = Object.keys(submember)[0];
            //@ts-ignore
            if (!reductionTree[top].find(obj => Object.keys(obj)[0] === key)) {
                reductionTree[top].push({[key]: []});
            }
            expandQuery(env, submember, subkey, reductionTree[top][reductionTree[top].length - 1], el, newTop);
        });
    } else {
        const expKey = Object.keys(member[key])[0];
        //@ts-ignore
        const expected = member[key][expKey];
        throwIfInvalidExpected(expected);
        const op = Object.keys(member[key])[0];
        if (VALID_OPERATORS.indexOf(op) === -1) {
            throw new Error(
                `Invalid operator: ${op}. Learn more at https://ayakashi.io/docs/guide/querying-with-domql.html`
            );
        }
        reductionTree[top].push(operators[op](createNodeQuery(env, el, key), expected));
    }
}

function throwIfInvalidExpected(expected: unknown) {
    if (!expected ||
        (Array.isArray(expected) && (
            expected.length === 0 || expected.some(val => !val)
        )) ||
        (typeof expected === "object" && !Array.isArray(expected))) {
            throw new Error(`Invalid expected value: ${
                Array.isArray(expected) ||
                    (typeof expected === "object" && expected !== null)
                ? JSON.stringify(expected) : String(expected) || "empty_string"
            }. Learn more at https://ayakashi.io/docs/guide/querying-with-domql.html`);
    }
}
