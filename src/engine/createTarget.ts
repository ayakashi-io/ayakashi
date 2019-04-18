const CDP = require("chrome-remote-interface");
import debug from "debug";
export type Unsubscriber = () => void;

const d = debug("ayakashi:engine:target");

export type Target = {
    tab: ICDPTab;
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
    port: number
): Promise<Target> {
    d(`creating new target tab for host:${host} port:${port}`);
    const tab: ICDPTab = await CDP.New({host: host, port: port});

    return {
        tab: tab,
        active: false,
        locked: false,
        lockedUntil: 0,
        close: () => CDP.Close({host: host, port: port, id: tab.id})
    };
}
