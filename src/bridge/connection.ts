import {Router, Express, json} from "express";
import {IHeadlessChrome} from "../engine/browser";
import debug from "debug";

const d = debug("ayakashi:bridge");

export function addConnectionRoutes(app: Express, browser: IHeadlessChrome) {
    const router = Router();
    router.use(json());

    router.post("/create_target", async function(_req, res) {
        try {
            const target = await browser.createTarget();
            if (target) {
                res.json({ok: true, target: target});
            } else {
                res.json({ok: false, msg: "no_available_target"});
            }
        } catch (e) {
            d(e);
            res.json({ok: false, msg: e.message});
        }
    });

    router.post("/released", async function(req, res) {
        try {
            await browser.destroyTarget(req.body.targetId, req.body.browserContextId);
            res.json({ok: true});
        } catch (e) {
            d(e);
            res.json({ok: false, msg: "could_not_destroy_target"});
        }
    });

    app.use("/connection", router);

}
