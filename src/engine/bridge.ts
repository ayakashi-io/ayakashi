import Express from "express";
import debug from "debug";
import {IHeadlessChrome} from "./browser";
import {Server} from "http";
const bodyParser = require("body-parser");

const d = debug("ayakashi:engine:bridge");

export function startBridge(browser: IHeadlessChrome, port: number): Promise<Server> {
    d("starting bridge on port:", port);
    const app = Express();
    app.use(bodyParser.json());

    app.post("/create_target", async function(_req, res) {
        try {
            const target = await browser.createTarget();
            if (target) {
                res.json({ok: true, target: target});
            } else {
                res.json({ok: false, msg: "no_available_target"});
            }
        } catch (e) {
            res.json({ok: false, msg: e.message});
        }
    });

    app.post("/connection_released", async function(req, res) {
        try {
            await browser.destroyTarget(req.body.targetId, req.body.browserContextId);
            res.json({ok: true});
        } catch (e) {
            d(e);
            res.json({ok: false, msg: "could_not_destory_target"});
        }
    });

    return new Promise(function(resolve, reject) {
        const bridge = app.listen(port, function() {
            d("bridge is listening on port", port);
            resolve(bridge);
        }).on("error", function(err) {
            reject(err);
        });
    });
}
