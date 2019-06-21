const CDP = require("chrome-remote-interface");
import debug from "debug";
export type Unsubscriber = () => void;

const d = debug("ayakashi:engine:target");

export type Target = {
    tab: ICDPTab | string;
    active: boolean;
    locked: boolean;
    lockedUntil: number;
    close: () => Promise<void>;
};

export interface ICDPTab {
    description: string;
    devtoolsFrontendUrl: string;
    id: string;
    title: string;
    type: string;
    url: string;
    webSocketDebuggerUrl: string;
}

export async function createTarget(
    host: string,
    port: number,
    options: {
        isHeadless: boolean,
        isPersistentSession: boolean
    }
): Promise<Target> {
    d(`creating new target tab for host:${host} port:${port}`);
    if (!options.isHeadless || options.isPersistentSession) {
        const tab: ICDPTab = await CDP.New({host: host, port: port});
        return {
            tab: tab,
            active: false,
            locked: false,
            lockedUntil: 0,
            close: () => CDP.Close({host: host, port: port, id: tab.id})
        };
    } else {
        const {webSocketDebuggerUrl} = await CDP.Version({host, port});
        const browser = await CDP({
            target: webSocketDebuggerUrl || `ws://${host}:${port}/devtools/browser`
        });
        const {browserContextId} = await browser.Target.createBrowserContext();
        const {targetId} = await browser.Target.createTarget({
            url: "about:blank",
            browserContextId
        });
        return {
            tab: `ws://${host}:${port}/devtools/page/${targetId}`,
            active: false,
            locked: false,
            lockedUntil: 0,
            close: () => CDP.Close({host: host, port: port, id: targetId})
        };
    }
}
