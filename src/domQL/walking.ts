import {runQuery} from "./query";

import {Query, El} from "./domQL";

export function domWalk(env: Window, query: Query, scope: Element) {
    let results: Node[] = [];
    const limit = query.limit || Number.MAX_SAFE_INTEGER;
    const skip = query.skip || 0;
    let passCounter = 0;
    let addedCounter = 0;
    function _domWalk(node: Node | null, callback: (node: Node | null) => boolean | void) {
        if (callback(node) === false) return false;
        let currentNode: Node | ChildNode | null = (node && node.firstChild) || null;
        while (currentNode != null) {
            if (_domWalk(currentNode, callback) === false) return false;
            currentNode = (<Node>currentNode).nextSibling;
        }
        return true;
    }
    if (query.order === "desc") {
        _domWalk(scope, el => {
            if (el === scope) return;
            if (el && el.nodeName === "#text") return;
            if (!query.where) {
                results.push(<Node>el);
            } else {
                if (runQuery(env, query, <El>el) === true) {
                    results.push(<Node>el);
                }
            }
        });
        results.reverse();
        results = results.splice(skip, limit);
    } else {
        _domWalk(scope, el => {
            if (el === scope) return;
            if (el && el.nodeName === "#text") return;
            let hasMatch = false;
            if (!query.where) {
                hasMatch = true;
            } else {
                hasMatch = runQuery(env, query, <El>el);
            }
            if (hasMatch === true) {
                passCounter += 1;
                if (passCounter > skip && addedCounter < limit) {
                    results.push(<Node>el);
                    addedCounter += 1;
                }
            }
        });
    }
    return <HTMLElement[]>results;
}

export function tagWalk(env: Window, query: Query, scope: Element) {
    const results: Node[] = [];
    const limit = query.limit || Number.MAX_SAFE_INTEGER;
    const skip = query.skip || 0;
    let passCounter = 0;
    let addedCounter = 0;
    const tags = Array.from(scope.getElementsByTagName("*"));
    if (query.order === "desc") {
        tags.reverse().forEach(el => {
            if (el === scope) return;
            if (el && el.nodeName === "#text") return;
            let hasMatch = false;
            if (!query.where) {
                hasMatch = true;
            } else {
                hasMatch = runQuery(env, query, <El>el);
            }
            if (hasMatch === true) {
                passCounter += 1;
                if (passCounter > skip && addedCounter < limit) {
                    results.push(<Node>el);
                    addedCounter += 1;
                }
            }
        });
    } else {
        tags.forEach(el => {
            if (el === scope) return;
            if (el && el.nodeName === "#text") return;
            let hasMatch = false;
            if (!query.where) {
                hasMatch = true;
            } else {
                hasMatch = runQuery(env, query, <El>el);
            }
            if (hasMatch === true) {
                passCounter += 1;
                if (passCounter > skip && addedCounter < limit) {
                    results.push(<Node>el);
                    addedCounter += 1;
                }
            }
        });
    }
    return <HTMLElement[]>results;
}
