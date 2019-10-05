import {Router, Express, json} from "express";
import {UserAgentDataStatic} from "../sessionDb/sessionDb";
import {getUserAgentData} from "../sessionDb/userAgent";
import {Sequelize} from "sequelize";
import debug from "debug";

const d = debug("ayakashi:bridge");

export function addUserAgentRoutes(app: Express, sessionDb: Sequelize, userAgentModel: UserAgentDataStatic) {
    const router = Router();
    router.use(json());

    router.post("/", async function(req, res) {
        try {
            const data = await getUserAgentData(sessionDb, userAgentModel, req.body);
            res.json({ok: true, userAgentData: data});
        } catch (e) {
            d(e);
            res.json({ok: false, msg: e.message});
        }
    });

    app.use("/user_agent", router);

}
