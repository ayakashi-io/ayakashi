import debug from "debug";
import {ICDPClient} from "./createConnection";

const d = debug("ayakashi:engine:target");

export type Target = {
    targetId: string;
    webSocketDebuggerUrl: string;
    browserContextId: string | null;
};

export async function createTarget(
    host: string,
    port: number,
    masterConnection: ICDPClient,
    inNewContext: boolean
): Promise<Target> {
    d(`creating new target tab for host:${host} port:${port}`);
    if (inNewContext) {
        const {browserContextId} = await masterConnection.Target.createBrowserContext();
        const {targetId} = await masterConnection.Target.createTarget({
            url: "about:blank",
            browserContextId
        });
        d("target created:", targetId, "in context:", browserContextId);
        return {
            targetId: targetId,
            webSocketDebuggerUrl: `ws://${host}:${port}/devtools/page/${targetId}`,
            browserContextId: browserContextId
        };
    } else {
        const {targetId} = await masterConnection.Target.createTarget({
            url: "about:blank"
        });
        d("target created:", targetId);
        return {
            targetId: targetId,
            webSocketDebuggerUrl: `ws://${host}:${port}/devtools/page/${targetId}`,
            browserContextId: null
        };
    }
}
