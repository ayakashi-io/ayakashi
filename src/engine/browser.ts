import debug from "debug";
import {launch, IBrowserInstance} from "./launcher";
import {createTarget, Target} from "./createTarget";
import {createConnection} from "../engine/createConnection";
import {startBridge} from "./bridge";
import {Server} from "http";
import {forever} from "async";
import {getOpLog} from "../opLog/opLog";

const d = debug("ayakashi:engine:browser");

const HOST = "localhost";

export interface IHeadlessChrome {
    chromeInstance: IBrowserInstance | null;
    bridge: Server | null;
    targets: Target[];
    maxTargets: number;
    getAvailableTarget: () => Promise<Target | null>;
    init: (options: {
        chromePath: string,
        headless?: boolean,
        maxTargets?: number,
        launchAttempts?: number,
        ignoreCertificateErrors?: boolean,
        userAgent?: string,
        autoOpenDevTools?: boolean,
        proxyUrl?: string,
        sessionDir?: string,
        windowWidth?: number,
        windowHeight?: number,
        bridgePort: number,
        protocolPort: number
    }) => Promise<void>;
    close: () => Promise<void>;
    createTarget: () => Promise<Target | null>;
    collectDeadTargets: () => Promise<void>;
}

type TargetOpQueue = {exec: Function, cb: Function, op: string}[];

const MAX_LAUNCH_ATTEMPTS = 3;

export function getInstance(): IHeadlessChrome {
    const SIGINT = "SIGINT";
    let BRIDGE_PORT: number;
    const targetOpQueue: TargetOpQueue = [];
    const targetOpQueueSignal = {stop: false};
    startTargetManager(targetOpQueueSignal, targetOpQueue);
    const opLog = getOpLog();
    return {
        chromeInstance: null,
        bridge: null,
        maxTargets: 10,
        targets: [],
        init: async function(options) {
            if (this.chromeInstance) return;
            if (!options) throw new Error("init_options_not_set");
            if (!options.chromePath) {
                throw new Error("chrome_path_not_set");
            }
            this.chromeInstance = await launchChrome({
                chromePath: options.chromePath,
                headless: options.headless === false ? false : true,
                ignoreCertificateErrors: options.ignoreCertificateErrors === true ? true : false,
                autoOpenDevTools: options.autoOpenDevTools === true ? true : false,
                userAgent: options.userAgent || "",
                launchAttempts: options.launchAttempts || MAX_LAUNCH_ATTEMPTS,
                windowSize: `${options.windowWidth || 1920},${options.windowHeight || 1080}`,
                proxyUrl: options.proxyUrl || "",
                sessionDir: options.sessionDir || "",
                protocolPort: options.protocolPort
            });
            if (!this.chromeInstance) {
                throw new Error("chrome_not_launched");
            }
            try {
                BRIDGE_PORT = options.bridgePort;
                this.bridge = await startBridge(this, BRIDGE_PORT);
                const sigintListener = async() => {
                    d("trap SIGINT, killing bridge and chrome");
                    await this.close();
                    process.removeListener(SIGINT, sigintListener);
                };
                process.on("SIGINT", sigintListener);
            } catch (err) {
                d(err);
                throw new Error("could_not_start_bridge");
            }
        },
        close: async function() {
            let forceKill = false;
            try {
                if (this.chromeInstance) {
                    const target = await createTarget(
                        HOST,
                        this.chromeInstance.port
                    );
                    if (!target) throw new Error("cannot_kill_chrome_instance");
                    const connection = await createConnection(target.tab, BRIDGE_PORT);
                    if (!connection) throw new Error("cannot_kill_chrome_instance");
                    await connection.client.Browser.close();
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
            return new Promise((resolve, reject) => {
                targetOpQueueSignal.stop = true;
                if (this.bridge) {
                    this.bridge.close()
                    .on("close", () => {
                        this.bridge = null;
                        resolve();
                    })
                    .on("error", (err) => {
                        d(err);
                        reject(new Error("could_not_close_bridge"));
                    });
                } else {
                    resolve();
                }
            });
        },
        /*
            getAvailableTarget/createTarget mark the target as locked
            with a lockedUntil of 10 seconds

            when a connection is activated with connection.activate(), its target is marked
            as active: true (in the bridge)

            when a connection is released with connection.release(), its target is marked
            as active: false and locked: false (in the bridge)

            inactive and locked-expired targets are then collected with collectDeadTargets()
        */
        getAvailableTarget: function() {
            const self = this;
            return new Promise(function(resolve, reject) {
                targetOpQueue.push({
                    op: "getAvailableTarget",
                    exec: function() {
                        const target = self.targets.find(trg => !trg.active && !trg.locked);
                        if (target) {
                            target.locked = true;
                            target.lockedUntil = Date.now() + 10000;
                            return target;
                        } else {
                            return null;
                        }
                    },
                    cb: function(err?: Error | null, result?: Target | null) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(result);
                        }
                    }
                });
            });
        },
        createTarget: async function() {
            const self = this;
            return new Promise(function(resolve, reject) {
                targetOpQueue.push({
                    op: "createTarget",
                    exec: async function() {
                        if (self.targets.length >= self.maxTargets) {
                            throw new Error("max_targets_reached");
                        }
                        if (self.chromeInstance) {
                            try {
                                const target = await createTarget(
                                    HOST,
                                    self.chromeInstance.port
                                );
                                target.locked = true;
                                target.lockedUntil = Date.now() + 10000;
                                self.targets.push(target);
                                return target;
                            } catch (err) {
                                d(err);
                                throw new Error("could_not_create_target");
                            }
                        } else {
                            return null;
                        }
                    },
                    cb: function(err?: Error | null, result?: Target | null) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(result);
                        }
                    }
                });
            });
        },
        collectDeadTargets: async function() {
            const self = this;
            return new Promise(function(resolve, reject) {
                targetOpQueue.push({
                    op: "collectDeadTargets",
                    exec: async function() {
                        d("collecting dead targets");
                        try {
                            //close inactive targets
                            //inactive = target.active == false or target.locked with an expired lock
                            const inactiveTargets = self.targets
                            .filter(trg => !trg.active || (trg.locked && trg.lockedUntil < Date.now()))
                            .map(trg => {
                                trg.active = false;
                                return trg;
                            });
                            //close them
                            await Promise.all(
                                inactiveTargets
                                .map(trg => trg.close())
                            );
                            //remove them from the instance
                            const deadTargetsIndexes = self.targets
                            .map((trg, i) => trg.active === false ? i : -1)
                            .filter(i => i > -1);
                            deadTargetsIndexes.forEach(index => {
                                self.targets.splice(index, 1);
                            });
                        } catch (err) {
                            d(err);
                            throw new Error("could_not_collect_targets");
                        }
                    },
                    cb: function(err?: Error | null) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    }
                });
            });
        }
    };
}

async function launchChrome(options: {
    chromePath: string,
    headless: boolean,
    launchAttempts: number,
    ignoreCertificateErrors: boolean,
    autoOpenDevTools: boolean,
    userAgent: string,
    windowSize: string,
    proxyUrl: string,
    sessionDir: string,
    protocolPort: number
}): Promise<IBrowserInstance> {
    d(`Launching Chrome instance. Headless: ${options.headless}`);
    const flags = [];
    if (options.headless) {
        flags.push("--headless");
    }
    if (options.ignoreCertificateErrors) {
        flags.push("--ignore-certificate-errors");
        flags.push("--allow-insecure-localhost");
    }
    if (options.userAgent) {
        flags.push(`--user-agent=${options.userAgent}`);
    }
    if (options.autoOpenDevTools) {
        flags.push("--auto-open-devtools-for-tabs");
    }
    if (options.proxyUrl) {
        flags.push(`--proxy-server=${options.proxyUrl}`);
    }
    flags.push(`--window-size=${options.windowSize}`);
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
        throw new Error(`Can't launch Chrome! (attempts: ${attempt - 1}/${options.launchAttempts})`);
    }

    return instance;
}

function sleep(delay: number) {
    return new Promise(resolve => setTimeout(resolve, delay));
}

function startTargetManager(signal: {stop: boolean}, targetOpQueue: TargetOpQueue) {
    forever(async function(next) {
        if (signal.stop) return next(new Error("stop"));
        if (targetOpQueue.length > 0) {
            const op = targetOpQueue.shift();
            if (op) {
                d("targetOpQueue:", op.op);
                try {
                    const result = await op.exec();
                    op.cb(null, result);
                } catch (err) {
                    op.cb(err);
                }
                setTimeout(next, 50);
            } else {
                setTimeout(next, 50);
            }
        } else {
            setTimeout(next, 50);
        }
    }, function() {});
}
