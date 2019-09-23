import {Store, Cookie, CookieJar as JarStore} from "tough-cookie";
import {Sequelize, Op} from "sequelize";
import {CookieStatic} from "../store/sessionDb";
import {CookieJar, jar} from "@ayakashi/request/core";
import {eachSeries as asyncEach, retry as asyncRetry} from "async";
import dayjs from "dayjs";
import debug from "debug";
const d = debug("ayakashi:Cookie");

//tslint:disable interface-name variable-name

export async function getCookieJar(sessionDb: Sequelize, CookieModel: CookieStatic, options: {persistentSession: boolean}): Promise<CookieJar> {
    if (options.persistentSession) {
        d("restoring jar");
        //create a new memory jar and add any cookies we have on the persistent store to it
        const memJar = jar();
        const storeJar = new JarStore(new CookieStore(sessionDb, CookieModel));
        return new Promise(function(resolve, reject) {
            storeJar.serialize(function(err, serialized) {
                if (err) return reject(err);
                serialized.cookies.forEach(function(cookie) {
                    memJar.setCookie(String(Cookie.fromJSON(cookie)), getCookieUrl(<Cookie>cookie), {
                        now: new Date(cookie.creation),
                        ignoreError: true
                    });
                });
                d("jar restored");
                resolve(memJar);
            });
        });
    } else {
        //just return a new memory jar
        return jar();
    }
}

export async function updateCookieJar(memJar: CookieJar, sessionDb: Sequelize, CookieModel: CookieStatic, options: {persistentSession: boolean}) {
    if (!options.persistentSession) return;
    d("updating jar");
    //@ts-ignore
    const memStore: JarStore = memJar._jar;
    const cookies = memStore.serializeSync().cookies;
    const storeJar = new JarStore(new CookieStore(sessionDb, CookieModel));
    return new Promise(function(resolve, reject) {
        asyncEach(cookies, function(cookie, next) {
            storeJar.setCookie(<Cookie>Cookie.fromJSON(cookie), getCookieUrl(cookie), next);
        }, function(err) {
            if (err) {
                reject(err);
            } else {
                d("jar updated");
                resolve();
            }
        });
    });
}

function getCookieUrl(cookie: Cookie.Serialized): string {
    let url = "";
    if (cookie.secure) {
        url += "https://";
    } else {
        url += "http://";
    }
    url += cookie.domain;
    url += (cookie.path || "");

    return url;
}

interface CookieStore extends Store {
    sessionDb: Sequelize;
    CookieModel: CookieStatic;
}

class CookieStore extends Store {
    constructor(sessionDb: Sequelize, CookieModel: CookieStatic) {
        super();
        this.sessionDb = sessionDb;
        this.CookieModel = CookieModel;
    }

    public findCookie(domain: string, path: string, key: string, cb: (err: null | Error, cookie: Cookie | null) => void) {
        this.CookieModel.findOne({
            where: {
                [Op.and]: [{
                    domain: domain
                }, {
                    path: path
                }, {
                    key: key
                }]
            }
        })
        .then(function(cookieInstance) {
            if (cookieInstance) {
                cb(null, <Cookie>cookieInstance.get({plain: true}));
            } else {
                cb(null, null);
            }
        })
        .catch(function(err) {
            cb(err, null);
        });
    }

    public findCookies(domain: string, path: string, cb: (err: null | Error, cookies: Cookie[]) => void) {
        let where;
        if (path === null) {
            where = {
                domain: domain
            };
        } else {
            where = {
                [Op.and]: [{
                    domain: domain
                }, {
                    path: path
                }]
            };
        }
        this.CookieModel.findAll({
            where: where
        })
        .then(function(cookieInstances) {
            if (cookieInstances && cookieInstances.length > 0) {
                cb(null, <Cookie[]>cookieInstances.map(c => c.get({plain: true})));
            } else {
                cb(null, []);
            }
        })
        .catch(function(err) {
            cb(err, []);
        });
    }

    public putCookie(cookie: Cookie, callback: (err: null | Error) => void) {
        asyncRetry({
            times: 10,
            interval: 100
        }, (cb) => {
            this.CookieModel.findOrCreate({
                where: {
                    [Op.and]: [{
                        domain: cookie.domain
                    }, {
                        path: cookie.path
                    }, {
                        key: cookie.key
                    }]
                },
                defaults: {
                    key: cookie.key,
                    value: cookie.value,
                    expires: dayjs(cookie.expires).isValid() ? cookie.expires : null,
                    maxAge: cookie.maxAge || null,
                    domain: cookie.domain,
                    path: cookie.path,
                    secure: cookie.secure,
                    httpOnly: cookie.httpOnly,
                    hostOnly: cookie.hostOnly,
                    creation: cookie.creation,
                    lastAccessed: cookie.lastAccessed
                }
            })
            .then(([cookieInstance, created]) => {
                if (created) {
                    return cb(null);
                }
                this.CookieModel.update(cookie, {
                    where: {
                        id: cookieInstance.id
                    }
                })
                .then(function() {
                    cb(null);
                })
                .catch(function(err) {
                    cb(err);
                });
            })
            .catch(function(err) {
                cb(err);
            });
        }, function(err) {
            callback(err || null);
        });
    }

    public updateCookie(oldCookie: Cookie, newCookie: Cookie, cb: (err: null | Error) => void) {
        this.CookieModel.update({
            value: newCookie.value,
            lastAccessed: newCookie.lastAccessed
        }, {
            where: {
                [Op.and]: [{
                    domain: oldCookie.domain
                }, {
                    path: oldCookie.path
                }, {
                    key: oldCookie.key
                }]
            }
        })
        .then(function() {
            cb(null);
        })
        .catch(function(err) {
            cb(err);
        });
    }

    public removeCookie(domain: string, path: string, key: string, cb: (err: null | Error) => void) {
        this.CookieModel.destroy({
            where: {
                [Op.and]: [{
                    domain: domain
                }, {
                    path: path
                }, {
                    key: key
                }]
            }
        })
        .then(function() {
            cb(null);
        })
        .catch(function(err) {
            cb(err);
        });
    }

    public removeCookies(domain: string, path: string, cb: (err: null | Error) => void) {
        this.CookieModel.destroy({
            where: {
                [Op.and]: [{
                    domain: domain
                }, {
                    path: path
                }]
            }
        })
        .then(function() {
            cb(null);
        })
        .catch(function(err) {
            cb(err);
        });
    }

    public removeAllCookies(cb: (err: null | Error) => void) {
        this.CookieModel.destroy()
        .then(function() {
            cb(null);
        })
        .catch(function(err) {
            cb(err);
        });
    }

    public getAllCookies(cb: (err: null | Error, cookies: Cookie[]) => void) {
        this.CookieModel.findAll()
        .then(function(cookieInstances) {
            if (cookieInstances && cookieInstances.length > 0) {
                cb(null, <Cookie[]>cookieInstances.map(c => c.get({plain: true})));
            } else {
                cb(null, []);
            }
        })
        .catch(function(err) {
            cb(err, []);
        });
    }
}
