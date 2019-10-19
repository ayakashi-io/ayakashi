import {Store, Cookie} from "tough-cookie";
import {Sequelize, Op} from "sequelize";
import {CookieStatic} from "../sessionDb/sessionDb";
import {retry as asyncRetry} from "async";
import dayjs from "dayjs";

//tslint:disable interface-name variable-name

export function getCookieUrl(cookie: Cookie.Serialized): string {
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

export interface DbCookieStore extends Store {
    sessionDb: Sequelize;
    CookieModel: CookieStatic;
}

export class DbCookieStore extends Store {
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
                this.CookieModel.update({
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
                }, {
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
