import {Sequelize, JSON as jsonDataType, INTEGER, TEXT, BOOLEAN, Model, BuildOptions} from "sequelize";
import {join as pathJoin} from "path";
import {UserAgentDataType} from "../utils/userAgent";
//tslint:disable interface-name callable-types variable-name
interface UserAgentData extends Model {
    readonly userAgentData: UserAgentDataType;
}

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

    sessionDb.define("Cookie", {
        id: { type: INTEGER, primaryKey: true, autoIncrement: true, allowNull: false, field: "id" },
        key: { type: TEXT, allowNull: false, field : "key"},
        value: { type: TEXT, allowNull: false, field : "value" },
        expires: {type: INTEGER, field : "expires"},
        maxAge: {type: INTEGER, field : "max_age"},
        domain: {type: TEXT, allowNull: false, field : "domain"},
        path: {type: TEXT, allowNull: false, field : "path"},
        secure: {type: BOOLEAN, allowNull: false, defaultValue: true, field : "secure"},
        httpOnly: {type: BOOLEAN, allowNull: false, defaultValue: true, field : "http_only"},
        creation: {type: INTEGER, field : "creation_time"},
        lastAccessed: {type: INTEGER, field : "last_accessed"}
    }, {
        timestamps: false,
        freezeTableName: true
    });

    if (opts.create) {
        await sessionDb.sync();
    }

    return {sessionDb, UserAgentDataModel};
}
