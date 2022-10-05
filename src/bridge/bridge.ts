import Express, {Express as App} from "express";
import debug from "debug";

const d = debug("ayakashi:bridge");

export function startBridge(port: number): Promise<{bridge: App, closeBridge: () => Promise<void>}> {
    d("starting bridge on port:", port);
    const app = Express();

    return new Promise(function(resolve, reject) {
        const bridge = app.listen(port, function() {
            d("bridge is listening on port", port);
            resolve({bridge: app, closeBridge: function() {
                return new Promise((res, rej) => {
                    if (bridge) {
                        bridge.close(function(err) {
                            if (err) {
                                d(err);
                                rej(new Error("could not close bridge"));
                            } else {
                                d(`bridge on port ${port} closed`);
                                res();
                            }
                        });
                    } else {
                        res();
                    }
                });
            }});
        }).on("error", function(err) {
            reject(err);
        });
    });
}
