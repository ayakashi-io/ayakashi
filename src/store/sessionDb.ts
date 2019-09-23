import {Sequelize, JSON as jsonDataType, INTEGER, TEXT, BOOLEAN, Model, BuildOptions, DATE} from "sequelize";
import {join as pathJoin} from "path";
import {UserAgentDataType} from "../utils/userAgent";
//tslint:disable interface-name callable-types variable-name
interface UserAgentData extends Model {
    readonly userAgentData: UserAgentDataType;
}

interface Cookie extends Model {
    readonly id: number;
    readonly key: string;
    readonly value: string;
    readonly expires: number;
    readonly maxAge: number;
    readonly domain: string;
    readonly path: string;
    readonly secure: boolean;
    readonly httpOnly: boolean;
    readonly hostOnly: boolean;
    readonly creation: number;
    readonly lastAccessed: number;
}

export type CookieStatic = typeof Model & {
    new (values?: object, options?: BuildOptions): Cookie;
};

export type UserAgentDataStatic = typeof Model & {
    new (values?: object, options?: BuildOptions): UserAgentData;
};

export async function sessionDbInit(storeProjectFolder: string, opts: {create: boolean}) {
    const sessionDb = new Sequelize({
        dialect: "sqlite",
        storage: pathJoin(storeProjectFolder, "session_db.sqlite"),
        logging: false
    });

    const UserAgentDataModel = <UserAgentDataStatic>sessionDb.define("UserAgentData", {
        userAgentData: jsonDataType
    }, {
        timestamps: false,
        freezeTableName: true
    });

    const CookieModel = <CookieStatic>sessionDb.define("Cookie", {
        id: { type: INTEGER, primaryKey: true, autoIncrement: true, allowNull: false},
        key: { type: TEXT, allowNull: false},
        value: { type: TEXT, allowNull: false},
        expires: {type: DATE, allowNull: true},
        maxAge: {type: INTEGER, allowNull: true},
        domain: {type: TEXT, allowNull: false},
        path: {type: TEXT, allowNull: false},
        secure: {type: BOOLEAN, allowNull: false, defaultValue: true},
        httpOnly: {type: BOOLEAN, allowNull: false, defaultValue: true},
        hostOnly: {type: BOOLEAN},
        creation: {type: DATE},
        lastAccessed: {type: DATE}
    }, {
        freezeTableName: true
    });

    if (opts.create) {
        await sessionDb.sync();
    }

    return {sessionDb, UserAgentDataModel, CookieModel};
}
