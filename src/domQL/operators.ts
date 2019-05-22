import {NodeQuery} from "./query";

type Reduction =  (() => boolean) | {[key: string]: object};

export const operators: {[key: string]: Function} = {
    and: function(...reductions: Reduction[]) {
        return function() {
            for (let i = 1; i <= reductions.length - 1; i += 1) {
                if (typeof reductions[i] === "object") {
                    const op = Object.keys(reductions[i])[0];
                    //@ts-ignore
                    reductions[i] = operators[op](...reductions[i][op]);
                }
            }
            let result = (<() => boolean>reductions[0])();
            for (let i = 1; i <= reductions.length - 1; i += 1) {
                result = result && (<() => boolean>reductions[i])();
                if (result === false) break;
            }
            return result;
        };
    },
    or: function(...reductions: Reduction[]) {
        return function() {
            for (let i = 1; i <= reductions.length - 1; i += 1) {
                if (typeof reductions[i] === "object") {
                    const op = Object.keys(reductions[i])[0];
                    //@ts-ignore
                    reductions[i] = operators[op](...reductions[i][op]);
                }
            }
            let result = (<() => boolean>reductions[0])();
            for (let i = 1; i <= reductions.length - 1; i += 1) {
                result = result || (<() => boolean>reductions[i])();
                if (result === true) break;
            }
            return result;
        };
    },
    eq: function(domQuery: NodeQuery, expected: string): () => boolean {
        return function() {
            const domResult = domQuery();
            if (domResult === null) return false;
            if (Array.isArray(domResult)) {
                return !!domResult.find(member => {
                    return member === expected;
                });
            } else {
                return domResult === expected;
            }
        };
    },
    $neq: function(domQuery: NodeQuery, expected: string): () => boolean {
        return function() {
            const domResult = domQuery();
            return _neq(domResult, expected);
        };
    },
    neq: function(domQuery: NodeQuery, expected: string): () => boolean {
        return function() {
            const domResult = domQuery();
            if (domResult === null) return true;
            return _neq(domResult, expected);
        };
    },
    like: function(domQuery: NodeQuery, expected: string | RegExp): () => boolean {
        return function() {
            const domResult = domQuery();
            if (domResult === null) return false;
            if (Array.isArray(domResult)) {
                return !!domResult.find(member => {
                    if (member && typeof member.match === "function") {
                        return !!member.match(expected);
                    } else {
                        return false;
                    }
                });
            } else if (typeof domResult.match === "function") {
                return !!domResult.match(expected);
            } else {
                return false;
            }
        };
    },
    $nlike: function(domQuery: NodeQuery, expected: string | RegExp): () => boolean {
        return function() {
            const domResult = domQuery();
            return _nlike(domResult, expected);
        };
    },
    nlike: function(domQuery: NodeQuery, expected: string | RegExp): () => boolean {
        return function() {
            const domResult = domQuery();
            if (domResult === null) return true;
            return _nlike(domResult, expected);
        };
    },
    in: function(domQuery: NodeQuery, expected: string[]): () => boolean {
        return function() {
            const domResult = domQuery();
            if (domResult === null) return false;
            if (Array.isArray(domResult)) {
                return !!domResult.find(member => {
                    if (expected && typeof expected.indexOf === "function") {
                        return expected.indexOf(member) > -1;
                    } else {
                        return false;
                    }
                });
            } else if (expected && typeof expected.indexOf === "function") {
                return expected.indexOf(domResult) > -1;
            } else {
                return false;
            }
        };
    },
    $nin: function(domQuery: NodeQuery, expected: string[]): () => boolean {
        return function() {
            const domResult = domQuery();
            return _nin(domResult, expected);
        };
    },
    nin: function(domQuery: NodeQuery, expected: string[]): () => boolean {
        return function() {
            const domResult = domQuery();
            if (domResult === null) return true;
            return _nin(domResult, expected);
        };
    }
};

function _neq(domResult: string | string[] | null, expected: string): boolean {
    if (Array.isArray(domResult)) {
        return !!domResult.find(member => {
            return member !== expected;
        });
    } else if (domResult) {
        return domResult !== expected;
    } else {
        return false;
    }
}

function _nlike(domResult: string | string[] | null, expected: string | RegExp): boolean {
    if (Array.isArray(domResult)) {
        return !!domResult.find(member => {
            if (member && typeof member.match === "function") {
                return !member.match(expected);
            } else {
                return false;
            }
        });
    } else if (domResult && typeof domResult.match === "function") {
        return !domResult.match(expected);
    } else {
        return false;
    }
}

function _nin(domResult: string | string[] | null, expected: string[]): boolean {
    if (Array.isArray(domResult)) {
        return !!domResult.find(member => {
            if (expected && typeof expected.indexOf === "function") {
                return expected.indexOf(member) === -1;
            } else {
                return false;
            }
        });
    } else if (domResult && expected && typeof expected.indexOf === "function") {
        return expected.indexOf(domResult) === -1;
    } else {
        return false;
    }
}
