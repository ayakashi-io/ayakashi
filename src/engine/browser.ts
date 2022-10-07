const CDP = require("chrome-remote-interface");
import debug from "debug";
import {launch, IBrowserInstance} from "./launcher";
import {createTarget, Target} from "./createTarget";
import {getOpLog} from "../opLog/opLog";
import {ICDPClient} from "./createConnection";
import {retryOnErrorOrTimeOut} from "../utils/retryOnErrorOrTimeout";

const d = debug("ayakashi:engine:browser");

const HOST = "localhost";

export interface IHeadlessChrome {
    chromeInstance: IBrowserInstance | null;
    init: (options: {
        chromePath: string,
        headless?: boolean,
        maxTargets?: number,
        launchAttempts?: number,
        autoOpenDevTools?: boolean,
        proxyUrl?: string,
        sessionDir?: string,
        windowWidth?: number,
        windowHeight?: number,
        protocolPort: number
    }) => Promise<void>;
    close: () => Promise<void>;
    createTarget: () => Promise<Target | null>;
    destroyTarget: (targetId: string, browserContextId: string | null) => Promise<void>;
}

const MAX_LAUNCH_ATTEMPTS = 3;

export function getInstance(): IHeadlessChrome {
    const SIGINT = "SIGINT";
    let isHeadless = true;
    let isPersistentSession = false;
    let masterConnection: ICDPClient;
    const opLog = getOpLog();
    return {
        chromeInstance: null,
        init: async function(options) {
            if (this.chromeInstance) return;
            if (!options) throw new Error("init_options_not_set");
            if (!options.chromePath) {
                throw new Error("chrome_path_not_set");
            }
            this.chromeInstance = await launchChrome({
                chromePath: options.chromePath,
                headless: options.headless === false ? false : true,
                autoOpenDevTools: options.autoOpenDevTools === true ? true : false,
                launchAttempts: options.launchAttempts || MAX_LAUNCH_ATTEMPTS,
                windowSize: `${options.windowWidth || 1920},${options.windowHeight || 1080}`,
                proxyUrl: options.proxyUrl || "",
                sessionDir: options.sessionDir || "",
                protocolPort: options.protocolPort
            });
            if (!this.chromeInstance) {
                throw new Error("chrome_not_launched");
            }
            isHeadless = options.headless !== false;
            isPersistentSession = !!options.sessionDir;
            try {
                masterConnection = await retryOnErrorOrTimeOut(() => {
                    return getMasterConnection(HOST, this.chromeInstance!.port);
                });
                const sigintListener = async() => {
                    d("trap SIGINT, closing chrome");
                    await this.close();
                    process.removeListener(SIGINT, sigintListener);
                };
                process.on(SIGINT, sigintListener);
            } catch (err) {
                d(err);
                throw new Error("could not establish master connection");
            }
        },
        close: async function() {
            let forceKill = false;
            try {
                if (this.chromeInstance) {
                    await masterConnection.Browser.close();
                    this.chromeInstance = null;
                }
            } catch (err) {
                d(err);
                forceKill = true;
            }
            try {
                if (forceKill && this.chromeInstance) {
                    d("force killing chrome...");
                    await this.chromeInstance.forceKill();
                }
            } catch (err) {
                d(err);
                opLog.error("Failed to close chrome");
            }
        },
        createTarget: async function() {
            if (this.chromeInstance) {
                try {
                    return createTarget(
                        HOST,
                        this.chromeInstance.port,
                        masterConnection,
                        isHeadless && !isPersistentSession
                    );
                } catch (err) {
                    d(err);
                    throw new Error("could_not_create_target");
                }
            } else {
                return null;
            }
        },
        destroyTarget: async function(targetId, browserContextId) {
            if (!this.chromeInstance) return;
            if (browserContextId) {
                d("disposing browserContextId", browserContextId);
                await masterConnection.Target.disposeBrowserContext({
                    browserContextId: browserContextId
                });
            }
            d("closing target", targetId);
            await masterConnection.Target.closeTarget({
                targetId: targetId
            });
        }
    };
}

async function launchChrome(options: {
    chromePath: string,
    headless: boolean,
    launchAttempts: number,
    autoOpenDevTools: boolean,
    windowSize: string,
    proxyUrl: string,
    sessionDir: string,
    protocolPort: number
}): Promise<IBrowserInstance> {
    const opLog = getOpLog();
    d(`Launching Chrome instance. Headless: ${options.headless}`);
    const flags = [];
    if (options.headless) {
        flags.push("--headless");
    }
    if (options.autoOpenDevTools) {
        flags.push("--auto-open-devtools-for-tabs");
    }
    if (options.proxyUrl) {
        flags.push(`--proxy-server=${options.proxyUrl}`);
    }
    flags.push(`--window-size=${options.windowSize}`);
    flags.push("--allow-insecure-localhost");
    let attempt = 0;
    let instance: IBrowserInstance | null = null;

    while (!instance && (attempt += 1) < options.launchAttempts) {
        d(`Launching Chrome. Attempt ${attempt}/${options.launchAttempts}...`);
        try {
            instance = await launch(flags, {
                chromePath: options.chromePath,
                sessionDir: options.sessionDir,
                protocolPort: options.protocolPort
            });
        } catch (err) {
            d(`Can not launch Chrome in attempt ${attempt}/${options.launchAttempts}. Error code: ${err.code}`, err);
            if (err.code === "EAGAIN" || err.code === "ECONNREFUSED") {
                await sleep(attempt * 1000);
                if (attempt >= options.launchAttempts) {
                    throw err;
                }
            } else {
                throw err;
            }
        }
    }
    if (!instance) {
        if (process.platform === "linux") {
            opLog.warn("If you are running this on a headless linux server, you might be missing some dependencies.");
            opLog.warn("Learn how to fix it here: https://ayakashi-io.github.io/docs/installation#installing-missing-chromium-dependencies-on-a-linux-server");
        }
        throw new Error(`Can't launch Chrome! (attempts: ${attempt - 1}/${options.launchAttempts})`);
    }

    return instance;
}

function sleep(delay: number) {
    return new Promise(resolve => setTimeout(resolve, delay));
}

async function getMasterConnection(host: string, port: number): Promise<ICDPClient> {
    const {webSocketDebuggerUrl} = await CDP.Version({host, port});
    const masterConnection: ICDPClient = await CDP({
        target: webSocketDebuggerUrl || `ws://${host}:${port}/devtools/browser`
    });
    if (!masterConnection.Target) {
        throw new Error("could not establish master connection");
    }

    return masterConnection;
}
