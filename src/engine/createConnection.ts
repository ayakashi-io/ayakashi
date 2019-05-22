const CDP = require("chrome-remote-interface");
import debug from "debug";
import {Unsubscriber, ICDPTab} from "./createTarget";
import {isRegExp} from "util";
import request from "request-promise-native";
//@ts-ignore
import {Mouse, Keyboard, Touchscreen} from "@ayakashi/input";
import {retry as asyncRetry} from "async";
import {ExponentialStrategy} from "backoff";

const d = debug("ayakashi:engine:connection");

/**
 * Emulation options for the scrapper to use.
 */
export type EmulatorOptions = {
    /**
     * Sets the available width.
     */
    width: number,
    /**
     * Sets the available height.
     */
    height: number,
    /**
     * Set it to true to emulate a mobile device.
     */
    mobile: boolean,
    deviceScaleFactor: 0
};

interface ICDPClient {
    _ws: {
        readyState: 1 | 2 | 3
    };
    close: () => Promise<void>;
    Browser: {
        close: () => Promise<void>;
    };
    Network: {
        enable: () => Promise<void>;
    };
    Page: {
        enable: () => Promise<void>;
        loadEventFired: (fn?: () => void) => (() => void);
        domContentEventFired: (fn?: () => void) => (() => void);
        navigate: (options: {url: string}) => Promise<void>;
        addScriptToEvaluateOnNewDocument: (arg0: {source: string}) => Promise<object>;
        removeScriptToEvaluateOnNewDocument: (scriptId: object) => Promise<void>;
        navigatedWithinDocument: (fn?: () => void) => (() => void);
        frameNavigated: (fn?: () => void) => (() => void);
        stopLoading: () => Promise<void>;
        setBypassCSP: (arg0: {enabled: boolean}) => Promise<void>;
    };
    DOM: {
        enable: () => Promise<void>;
        querySelector: (arg: {nodeId: number, selector: string}) => Promise<{nodeId: number}>;
        //tslint:disable no-any
        getDocument: () => Promise<{root: any}>;
        //tslint:enable no-any
        focus: (arg: {nodeId: number}) => Promise<void>;
    };
    CSS: {
        enable: () => Promise<void>;
    };
    DOMStorage: {
        enable: () => Promise<void>;
    };
    Security: {
        enable: () => Promise<void>;
    };
    Console: {
        enable: () => Promise<void>;
    };
    Emulation: {
        setDeviceMetricsOverride: (metrics: EmulatorOptions) => void;
        setVisibleSize: (size: {width: EmulatorOptions["width"], height: EmulatorOptions["height"]}) => void;
    };
    Target: {
        activateTarget: (options: {targetId: string}) => Promise<void>;
    };
    Runtime: {
        enable: () => Promise<void>;
        //tslint:disable no-any
        evaluate: (options: {
            expression: string,
            returnByValue: boolean,
            awaitPromise: boolean
        }) => Promise<{result: {value: any}, exceptionDetails?: object}>;
        //tslint:enable no-any
    };
    on: (
        domainEvent: string,
        listener: () => void
    ) => Unsubscriber;
    removeListener: (
        domainEvent: string,
        listener: () => void
    ) => void;
}

export interface IConnection {
    client: ICDPClient;
    tab: ICDPTab;
    active: boolean;
    preloaderIds: object[];
    preloaders: string[];
    unsubscribers: Unsubscriber[];
    timeouts: NodeJS.Timeout[];
    intervals: NodeJS.Timeout[];
    namespace: string;
    useNameSpace: (ns: string) => Promise<void>;
    activate: () => Promise<void>;
    release: () => Promise<void>;
    //tslint:disable no-any
    evaluate: <T>(fn: (...args: any[]) => T, ...args: any[]) => Promise<T>;
    evaluateAsync: <T>(fn: (...args: any[]) => Promise<T>, ...args: any[]) => Promise<T>;
    //tslint:enable no-any
    injectPreloader: (options: {
        compiled: {
            wrapper: string,
            source: string
        },
        as: string | null,
        waitForDOM: boolean
    }) => Promise<void>;
    pipe: {
        console: (
            listener: (text: string) => void
        ) => void;
        uncaughtException: (
            listener: (exception: {
                text: string,
                lineNumber: number,
                columnNumber: number,
                stackTrace: Object
            }) => void
        ) => void;
    };
    mouse: {
        click: (
            x: number,
            y: number,
            options?: {button?: "left"|"right"|"middle", clickCount?: number}
        ) => Promise<void>;
        move: (
            x: number,
            y: number
        ) => Promise<void>
    };
    touchScreen: {
        tap: (
            x: number,
            y: number
        ) => Promise<void>
    };
    keyBoard: {
        type: (
            text: string,
            options?: {delay: number}
        ) => Promise<void>;
        press: (
            key: string,
            options?: {delay: number}
        ) => Promise<void>;
    };
}

export async function createConnection(
    tab: ICDPTab,
    bridgePort: number,
    emulatorOptions?: EmulatorOptions
): Promise<IConnection> {
    try {
        d("creating new connection");
        const client: ICDPClient = await retryOnErrorOrTimeOut<ICDPClient>(async function() {
            const _client: ICDPClient = await CDP({target: tab});
            await Promise.all([
                _client.Network.enable(),
                _client.Page.enable(),
                _client.DOM.enable(),
                _client.CSS.enable(),
                _client.DOMStorage.enable(),
                _client.Security.enable(),
                _client.Console.enable(),
                _client.Runtime.enable()
            ]);
            return _client;
        });
        d("connection created");
        const defaultEmulatorOptions: EmulatorOptions = {
            width: 1920,
            height: 1080,
            mobile: false,
            deviceScaleFactor: 0
        };
        await client.Emulation.setDeviceMetricsOverride({
            width: (emulatorOptions && emulatorOptions.width) || defaultEmulatorOptions.width,
            height: (emulatorOptions && emulatorOptions.height) || defaultEmulatorOptions.height,
            mobile: (emulatorOptions && emulatorOptions.mobile) || defaultEmulatorOptions.mobile,
            deviceScaleFactor: (emulatorOptions && emulatorOptions.deviceScaleFactor) ||
                                defaultEmulatorOptions.deviceScaleFactor
        });
        await client.Emulation.setVisibleSize({
            width: (emulatorOptions && emulatorOptions.width) || defaultEmulatorOptions.width,
            height: (emulatorOptions && emulatorOptions.height) || defaultEmulatorOptions.height
        });
        await client.Page.setBypassCSP({enabled: true});
        const _keyBoard = new Keyboard(client);
        const _mouse = new Mouse(client, _keyBoard);
        const _touchScreen = new Touchscreen(client, _keyBoard);
        const connection: IConnection = {
            tab,
            client,
            namespace: "",
            active: false,
            preloaderIds: [],
            preloaders: [],
            unsubscribers: [],
            timeouts: [],
            intervals: [],
            keyBoard: _keyBoard,
            mouse: _mouse,
            touchScreen: _touchScreen,
            activate: async function() {
                d(`activating connection: ${tab.id}`);
                if (connection.active) throw new Error("connection_already_active");
                try {
                    // we don't need to focus the active target
                    // await client.Target.activateTarget({targetId: tab.id});
                    connection.active = true;
                    await request.post(`http://localhost:${bridgePort}/connection_activated`, {
                        json: {
                            id: tab.id
                        }
                    });
                    d("connection activated");
                } catch (err) {
                    d(err);
                    throw new Error("could_not_activate_connection");
                }
            },
            release: async function() {
                d(`releasing connection: ${tab.id}`);
                if (!connection.active) throw new Error("connection_not_active");
                try {
                    await retryOnErrorOrTimeOut<void>(async function() {
                        connection.unsubscribers.forEach(unsubscriber => unsubscriber());
                        connection.unsubscribers = [];
                        if (client && client._ws && client._ws.readyState !== 3) {
                            await Promise.all(
                                connection.preloaderIds
                                .map(preloaderId => client.Page.removeScriptToEvaluateOnNewDocument(preloaderId))
                            );
                        }
                        connection.preloaderIds = [];
                        connection.timeouts.forEach(function(id) {
                            clearTimeout(id);
                        });
                        connection.intervals.forEach(function(id) {
                            clearInterval(id);
                        });
                        connection.timeouts = [];
                        connection.intervals = [];
                        if (client && client._ws && client._ws.readyState !== 3) {
                            await connection.client.Page.stopLoading();
                            await connection.client.Page.navigate({url: "about:blank"});
                            await connection.client.Page.domContentEventFired();
                            await client.close();
                        }
                        connection.active = false;
                        await request.post(`http://localhost:${bridgePort}/connection_released`, {
                            json: {
                                id: tab.id
                            }
                        });
                    });
                    d(`connection released: ${tab.id}`);
                } catch (err) {
                    d(err);
                    throw new Error("could_not_release_connection");
                }
            },
            useNameSpace: async function(ns: string) {
                this.namespace = ns;
                const scriptId = await client.Page.addScriptToEvaluateOnNewDocument({
                    source: `
                        window['${this.namespace}'] = {};
                        window['${this.namespace}'].paused = false;
                        window['${this.namespace}'].resume = function() {
                            window['${this.namespace}'].paused = false;
                        };
                        window['${this.namespace}'].propTable = {};
                        window['${this.namespace}'].extractors = {};
                        window['${this.namespace}'].preloaders = {};
                    `
                });
                connection.preloaderIds.push(scriptId);
            },
            evaluate: async function(fn, ...args) {
                d(`evaluating expression on connection: ${tab.id}`);
                return evaluate(this, false, fn, args);
            },
            evaluateAsync: async function(fn, ...args) {
                d(`evaluating async expression on connection: ${tab.id}`);
                return evaluate(this, true, fn, args);
            },
            injectPreloader: async function({compiled: {wrapper, source}, as, waitForDOM}) {
                if (connection.active) throw new Error("cannot_inject_preloader_into_active_connection");
                if (connection.preloaders.indexOf(wrapper) > -1) return;
                connection.preloaders.push(wrapper);
                const hasAlias = !!as;
                //tslint:disable max-line-length
                if (waitForDOM) {
                    const scriptId = await client.Page.addScriptToEvaluateOnNewDocument({
                        source: `
                            (function() {
                                document.addEventListener("DOMContentLoaded", function() {
                                    ${source}
                                    if (${hasAlias}) {
                                        window['${connection.namespace}'].preloaders["${as}"] = ${connection.namespace}__${wrapper};
                                    } else {
                                        window['${connection.namespace}'].preloaders["${wrapper}"] = ${connection.namespace}__${wrapper};
                                    }
                                });
                            }).call(window);
                        `
                    });
                    connection.preloaderIds.push(scriptId);
                } else {
                    const scriptId = await client.Page.addScriptToEvaluateOnNewDocument({
                        source: `
                            (function() {
                                ${source}
                                if (${hasAlias}) {
                                    window['${connection.namespace}'].preloaders["${as}"] = ${connection.namespace}__${wrapper};
                                } else {
                                    window['${connection.namespace}'].preloaders["${wrapper}"] = ${connection.namespace}__${wrapper};
                                }
                            }).call(window);
                        `
                    });
                    connection.preloaderIds.push(scriptId);
                }
                //tslint:enable
                d("injected preloader:", wrapper);
            },
            pipe: {
                console: function(listener) {
                    pipeEvent(connection, "Console", "messageAdded", function(consoleMsg: {message: {text: string}}) {
                        listener(consoleMsg.message.text);
                    });
                },
                uncaughtException: function(listener) {
                    pipeEvent(connection, "Runtime", "exceptionThrown", function(exception: {
                        exceptionDetails: {
                            exception: {description: string},
                            lineNumber: number,
                            columnNumber: number,
                            stackTrace: object
                        }
                    }) {
                        listener({
                            text: exception.exceptionDetails.exception.description,
                            lineNumber: exception.exceptionDetails.lineNumber,
                            columnNumber: exception.exceptionDetails.columnNumber,
                            stackTrace: exception.exceptionDetails.stackTrace
                        });
                    });
                }
            }
        };
        return connection;
    } catch (err) {
        d(err);
        throw new Error("could_not_create_connection");
    }
}

async function evaluate<T>(
    connection: IConnection,
    awaitPromise: boolean,
    //tslint:disable no-any
    fn: (...args: any[]) => T,
    args: any[]
    //tslint:enable no-any
): Promise<T> {
    if (!connection.active) throw new Error("connection_not_active");
    try {
        let exp: string;
        const namespace = connection.namespace ? `window['${connection.namespace}']` : null;
        if (args && args.length > 0) {
            args.forEach(function(arg, i) {
                if (typeof arg === "function") {
                    args[i] = arg.toString();
                } else if (isRegExp(arg)) {
                    args[i] = {isRegex: true, source: arg.source, flags: arg.flags};
                }
            });
            //tslint:disable
            exp = `(function() {
                "use strict";
                const args = ${JSON.stringify(args)};` +
                "args.forEach(function(arg, i) {\
                    if (arg && typeof arg.indexOf === 'function' && (arg.indexOf('function') === 0 || arg.indexOf('=>') > -1)) {\
                        const func = args[i];\
                        args[i] = function(results) {\
                            let exec = new Function('results', `return (${func}).call(null, results);`);\
                            return exec(results);\
                        };\
                    }\
                    if (arg && arg.isRegex) {\
                        args[i] = new RegExp(arg.source, arg.flags);\
                    }\
                });" +
                `return (${String(fn)}).apply(${namespace}, args)
            })()`;
            //tslint:enable
        } else {
            exp = `(${String(fn)}).apply(${namespace})`;
        }
        const evaled = await connection.client.Runtime.evaluate({
            expression: exp,
            returnByValue: true,
            awaitPromise: awaitPromise
        });
        if (evaled.exceptionDetails) {
            //@ts-ignore
            throw new EvalError(evaled.exceptionDetails.exception.description || evaled.exceptionDetails.text);
        } else {
            return evaled.result.value;
        }
    } catch (err) {
        d(err);
        throw err;
    }
}

function EvalError(this: Error, message: string) {
    this.name = "EvalError";
    this.message = message;
}
EvalError.prototype = new Error();

function pipeEvent(
    connection: IConnection,
    domain: "Console" | "Runtime",
    eventName: string,
    //tslint:disable no-any
    listener: (...params: any) => void
    //tslint:enable no-any
): void {
    if (connection.active) throw new Error("cannot_pipe_events_into_active_connection");
    d(`piping ${domain}.${eventName}`);
    connection.client.on(`${domain}.${eventName}`, listener);
    connection.unsubscribers.push(function() {
        connection.client.removeListener(`${domain}.${eventName}`, listener);
    });
}

async function retryOnErrorOrTimeOut<T>(task: () => Promise<T>): Promise<T> {
    const strategy = new ExponentialStrategy({
        randomisationFactor: 0.5,
        initialDelay: 100,
        maxDelay: 1000,
        factor: 2
    });
    let retried = 0;
    return new Promise(function(resolve, reject) {
        asyncRetry({
            times: 10,
            interval: function() {
                return strategy.next();
            }
        }, function(cb) {
            let resolved = false;
            let aborted = false;
            const timedOut = setTimeout(function() {
                if (!resolved) {
                    retried += 1;
                    d(`connection creation/release timed out -`, `retries: ${retried}`);
                    aborted = true;
                    cb(new Error(`timed_out`));
                }
            }, 1000);
            task()
            .then(function(taskResult) {
                if (!aborted) {
                    resolved = true;
                    clearTimeout(timedOut);
                    cb(null, taskResult);
                }
            })
            .catch(function(err: Error) {
                if (!aborted) {
                    resolved = true;
                    clearTimeout(timedOut);
                    cb(err);
                }
            });
        }, function(err, taskResult: T) {
            if (err) {
                reject(err);
            } else {
                resolve(taskResult);
            }
        });
    });
}
