import net from "net";
import {spawn, ChildProcess} from "child_process";
import debug from "debug";
import {sync as mkdirp} from "mkdirp";
import {mkdtempSync} from "fs";
import {tmpdir} from "os";
import {join, resolve as pathResolve} from "path";

const d = debug("ayakashi:engine:launcher");

const DEFAULT_FLAGS = [
    // Disable built-in Google Translate service
    "--disable-translate",
    // Disable all chrome extensions entirely
    "--disable-extensions",
    // Disable various background network services, including extension updating,
    // safe browsing service, upgrade detector, translate, UMA
    "--disable-background-networking",
    // Disable fetching safebrowsing lists, likely redundant due to disable-background-networking
    "--safebrowsing-disable-auto-update",
    // Disable syncing to a Google account
    "--disable-sync",
    // Disable reporting to UMA, but allows for collection
    "--metrics-recording-only",
    // Disable installation of default apps on first run
    "--disable-default-apps",
    // Mute any audio
    "--mute-audio",
    // Skip first run wizards
    "--no-first-run",
    "--no-default-browser-check",
    "--no-service-autorun",
    // disable some features
    "--disable-smooth-scrolling",
    "--disable-suggestions-ui",
    "--disable-signin-promo",
    "--disable-password-generation",
    "--disable-cloud-import",
    "--disable-default-apps",
    // disable repost dialog
    "--disable-prompt-on-repost",
    // isolate
    // "--site-per-process",
    // other
    "--disable-gpu"
    // "--disable-setuid-sandbox",
    // "--no-sandbox"
];

export interface IBrowserInstance {
    pid: number;
    port: number;
    process: ChildProcess;
    forceKill: () => Promise<{}>;
}

export async function launch(
    passedFlags: string[],
    options: {
        chromePath: string,
        sessionDir: string,
        protocolPort: number
    }
): Promise<IBrowserInstance> {
    try {
        let userDir: string;
        if (options.sessionDir) {
            d("using session directory:", options.sessionDir);
            mkdirp(options.sessionDir);
            userDir = options.sessionDir;
        } else {
            d("using tmp session directory");
            userDir = createTmpDir();
        }
        const flags = DEFAULT_FLAGS.concat([
            `--remote-debugging-port=${options.protocolPort}`,
            `--user-data-dir=${pathResolve(__dirname, userDir)}`
        ].concat(passedFlags));
        d(`Launching: \n${options.chromePath} ${flags.join(" ")}`);
        const chrome = await spawnProcess(options.chromePath, options.protocolPort, flags);
        d(`Chrome running with pid ${chrome.pid} on port ${options.protocolPort}.`);
        return {
            pid: chrome.pid,
            port: options.protocolPort,
            process: chrome,
            forceKill: () => forceKill(chrome)
        };
    } catch (err) {
        throw err;
    }
}

function isDebuggerReady(port: number) {
    return new Promise(function(resolve, reject)  {
        const client = net.createConnection(port);
        client.once("error", err => {
            cleanup(client);
            reject(err);
        });
        client.once("connect", () => {
            cleanup(client);
            resolve();
        });
    });
}

function waitUntilReady(port: number) {
    return new Promise<number>(function(resolve, reject) {
        let retries = 0;

        function poll() {
            isDebuggerReady(port).then(() => {
                d("Chrome instance is ready");
                resolve(retries);
            })
            .catch(err => {
                if (retries > 10) {
                    d("Max retries reached");
                    return reject(err);
                }
                setTimeout(poll, 500);
            });
            retries += 1;
            d(`Waiting for Chrome instance, retries: ${retries}/10`);
        }
        poll();
    });
}

async function spawnProcess(chromePath: string, port: number, flags: string[]): Promise<ChildProcess> {
    try {
        d("spawning...");
        const chrome = await spawn(chromePath, flags, {detached: process.platform !== "win32"});
        const chromeDebug = debug("ayakashi:chrome");
        chrome.stderr.on("data", (data) => {
            chromeDebug(`stderr: ${data}`);
        });
        chrome.stdout.on("data", (data) => {
            chromeDebug(`stdout: ${data}`);
        });
        await waitUntilReady(port);
        return chrome;
    } catch (err) {
        throw err;
    }
}

function cleanup(client: net.Socket) {
    if (client) {
        client.removeAllListeners();
        client.end();
        client.destroy();
        client.unref();
    }
}

function forceKill(
    chrome: ChildProcess
) {
    return new Promise((resolve, reject) => {
        chrome.on("exit", () => {
            resolve();
        });
        d("Killing chrome instance");
        try {
            process.kill(chrome.pid);
        } catch (err) {
            d(err);
            d(`Chrome could not be killed ${err.message}`);
            reject(err);
        }
    });
}

function createTmpDir() {
    return mkdtempSync(join(tmpdir(), "ayakashi."));
}
