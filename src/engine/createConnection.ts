const CDP = require("chrome-remote-interface");
import debug from "debug";
import {Target} from "./createTarget";
//@ts-ignore
import {Mouse, Keyboard, Touchscreen} from "@ayakashi/input";
import {EmulatorOptions} from "../runner/parseConfig";
import {retryOnErrorOrTimeOut} from "../utils/retryOnErrorOrTimeout";
import {getBridgeClient} from "../bridge/client";
import {replacer, getReviver} from "../utils/marshalling";

const d = debug("ayakashi:engine:connection");

type Unsubscriber = () => void;

export type ChromeCookie = {
    name: string;
    value: string;
    url?: string;
    domain?: string;
    path?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: "Strict" | "Lax" | "Extended" | "None";
    expires?: number;
};

export interface ICDPClient {
    _ws: {
        readyState: 1 | 2 | 3
    };
    close: () => Promise<void>;
    Browser: {
        close: () => Promise<void>;
    };
    Network: {
        enable: () => Promise<void>;
        setCookies: (arg: {cookies: ChromeCookie[]}) => Promise<boolean>;
        getCookies: (arg?: {urls?: string[]}) => Promise<{cookies: ChromeCookie[]}>;
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
        setIgnoreCertificateErrors: (arg: {ignore: boolean}) => Promise<void>;
    };
    Console: {
        enable: () => Promise<void>;
    };
    Emulation: {
        setDeviceMetricsOverride: (metrics: EmulatorOptions) => Promise<void>;
        setVisibleSize: (size: {width: EmulatorOptions["width"], height: EmulatorOptions["height"]}) => Promise<void>;
        setUserAgentOverride: (arg: {
            userAgent: string,
            acceptLanguage: string,
            platform: string
        }) => Promise<void>;
    };
    Target: {
        createTarget: (options: {url: string, browserContextId?: string}) => Promise<{targetId: string}>;
        activateTarget: (options: {targetId: string}) => Promise<void>;
        closeTarget: (options: {targetId: string}) => Promise<void>;
        createBrowserContext: () => Promise<{browserContextId: string}>;
        disposeBrowserContext: (options: {browserContextId: string}) => Promise<void>;
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
    target: Target;
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
    evaluate: <T, U extends any[]>(
        fn: (
            this: Window["ayakashi"],
            ...params: U
        ) => T,
        ...args: U
    ) => Promise<T>;
    evaluateAsync: <T, U extends any[]>(
        fn: (
            this: Window["ayakashi"],
            ...params: U
        ) => Promise<T>,
        ...args: U
    ) => Promise<T>;
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
    target: Target,
    bridgePort: number,
    emulatorOptions?: EmulatorOptions
): Promise<IConnection> {
    try {
        d("creating new connection", target.targetId);
        const bridgeClient = getBridgeClient(bridgePort);
        const client: ICDPClient = await retryOnErrorOrTimeOut<ICDPClient>(async function() {
            const _client: ICDPClient = await CDP({target: target.webSocketDebuggerUrl});
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
            target,
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
                d(`activating connection`);
                if (connection.active) throw new Error("connection_already_active");
                connection.active = true;
                d("connection activated");
            },
            release: async function() {
                d(`releasing connection`);
                if (!connection.active) throw new Error("connection_not_active");
                try {
                    await retryOnErrorOrTimeOut<void>(async function() {
                        await client.Page.stopLoading();
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
                            d("closing client");
                            await client.close();
                        }
                        await bridgeClient.connectionReleased(target);
                        connection.active = false;
                    });
                    d(`connection released`);
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
                        window['${this.namespace}'].document = document;
                        window['${this.namespace}'].window = window;
                    `
                });
                connection.preloaderIds.push(scriptId);
            },
            evaluate: async function(fn, ...args) {
                d(`evaluating expression on connection`);
                return evaluate(this, false, fn, ...args);
            },
            evaluateAsync: async function(fn, ...args) {
                d(`evaluating async expression on connection`);
                return evaluate(this, true, fn, ...args);
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

//tslint:disable no-any
async function evaluate<T, U extends any[]>(
    connection: IConnection,
    awaitPromise: boolean,
    fn: (
        this: Window["ayakashi"],
        ...params: U
    ) => T,
    ...args: U
    //tslint:enable no-any
): Promise<T> {
    if (!connection.active) throw new Error("connection_not_active");
    try {
        let exp: string;
        const namespace = connection.namespace ? `window['${connection.namespace}']` : null;
        if (args && args.length > 0) {
            exp = `(function() {
                "use strict";\n
                const serializedArgs = '${JSON.stringify(args, replacer)}';\n
                const args = JSON.parse(serializedArgs, ${namespace}.preloaders.marshalling.getReviver("${namespace}"));\n
                let result = (${String(fn)}).apply(${namespace}, args);
                if (result instanceof Promise) {
                    return result.then(function(resolved) {
                        return JSON.stringify(resolved, ${namespace}.preloaders.marshalling.replacer);
                    });
                } else {
                    return JSON.stringify(result, ${namespace}.preloaders.marshalling.replacer);
                }
            })()`;
        } else {
            exp = `
                (function() {
                    let result = (${String(fn)}).apply(${namespace});
                    if (result instanceof Promise) {
                        return result.then(function(resolved) {
                            return JSON.stringify(resolved, ${namespace}.preloaders.marshalling.replacer);
                        });
                    } else {
                        return JSON.stringify(result, ${namespace}.preloaders.marshalling.replacer);
                    }
                })()`;
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
            if (typeof evaled.result.value === "string") {
                const reviver = getReviver("{ayakashi: {}}");
                return JSON.parse(evaled.result.value, reviver);
            } else {
                return evaled.result.value;
            }
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
