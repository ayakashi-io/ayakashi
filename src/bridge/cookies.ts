import {Router, Express, json} from "express";
import {eachSeries as asyncEach} from "async";
import {Cookie, CookieJar} from "tough-cookie";
import {CookieStatic} from "../sessionDb/sessionDb";
import {DbCookieStore} from "../sessionDb/cookieStore";
import {getCookieUrl} from "../utils/cookieHelpers";
import {Sequelize} from "sequelize";
import debug from "debug";

//tslint:disable variable-name

const d = debug("ayakashi:bridge");

export function addCookiesRoutes(app: Express, sessionDb: Sequelize, CookieModel: CookieStatic) {
    const router = Router();
    router.use(json());

    router.post("/get_jar", async function(_req, res) {
        d("restoring jar");
        try {
            const storeJar = new CookieJar(new DbCookieStore(sessionDb, CookieModel), {
                rejectPublicSuffixes: false,
                looseMode: true
            });
            storeJar.serialize(function(err, serialized) {
                if (err) {
                    d(err);
                    res.json({ok: false, msg: err.message});
                } else {
                    d("jar restored");
                    res.json({
                        ok: true,
                        cookies: serialized.cookies
                    });
                }
            });
        } catch (e) {
            d(e);
            res.json({ok: false, msg: e.message});
        }
    });

    router.post("/update_jar", async function(req, res) {
        d("updating jar");
        try {
            const cookies: Cookie.Serialized[] = req.body.cookies;
            const storeJar = new CookieJar(new DbCookieStore(sessionDb, CookieModel), {
                rejectPublicSuffixes: false,
                looseMode: true
            });
            asyncEach(cookies, function(cookieObject, next) {
                const cookie = Cookie.fromJSON(cookieObject);
                if (!cookie) {
                    return next();
                }
                storeJar.setCookie(cookie, getCookieUrl(cookie), next);
            }, function(err) {
                if (err) {
                    d(err);
                    res.json({ok: false, msg: err.message});
                } else {
                    d("jar updated");
                    res.json({ok: true});
                }
            });
        } catch (e) {
            d(e);
            res.json({ok: false, msg: e.message});
        }
    });

    app.use("/cookies", router);

}
