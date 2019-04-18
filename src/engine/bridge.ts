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

    app.post("/get_available_target", async function(_req, res) {
        const target = await browser.getAvailableTarget();
        if (target) {
            res.json({ok: true, tab: target.tab});
        } else {
            res.json({ok: false, msg: "no_available_target"});
        }
    });

    app.post("/create_target", async function(_req, res) {
        try {
            const target = await browser.createTarget();
            if (target) {
                res.json({ok: true, tab: target.tab});
            } else {
                res.json({ok: false, msg: "no_available_target"});
            }
        } catch (e) {
            res.json({ok: false, msg: e.message});
        }
    });

    app.post("/collect_dead_targets", async function(_req, res) {
        try {
            await browser.collectDeadTargets();
            res.json({ok: true});
        } catch (e) {
            res.json({ok: false, msg: e.message});
        }
    });

    app.post("/connection_activated", function(req, res) {
        const target = browser.targets.find(trg => trg.tab.id === req.body.id);
        if (target) {
            target.active = true;
            res.json({ok: true});
        } else {
            res.json({ok: false, msg: "invalid_target"});
        }
    });

    app.post("/connection_released", function(req, res) {
        const target = browser.targets.find(trg => trg.tab.id === req.body.id);
        if (target) {
            target.active = false;
            target.locked = false;
            target.lockedUntil = 0;
            res.json({ok: true});
        } else {
            res.json({ok: false, msg: "invalid_target"});
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
