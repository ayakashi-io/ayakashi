import Sequelize from "sequelize";
import {join as pathJoin} from "path";
import normalizeExtraction from "./normalizeExtractions";
import {getOpLog} from "../opLog/opLog";
import _mkdirp from "mkdirp";
import {promisify} from "util";
const mkdirp = promisify(_mkdirp);

export default async function(
    input: {
        [key: string]: {
            [key: string]: unknown
        }[] | {
            [key: string]: unknown
        }[]
    },
    params: {
        dialect?: "mysql" | "mariadb" | "postgres" | "mssql" | "sqlite",
        host?: string,
        port?: number,
        database?: string,
        username?: string,
        password?: string,
        connectionURI?: string,
        table?: string
    },
    system: {
        projectFolder: string,
        operationId: string,
        startDate: string
    }
) {
    const opLog = getOpLog();
    let extraction: {
        [key: string]: unknown;
    }[];
    if (Array.isArray(input)) {
        extraction = input.filter(inp => !!inp);
    } else {
        extraction = normalizeExtraction(input);
    }
    if (!extraction || extraction.length === 0) {
        opLog.warn("saveToSQL: nothing to save");
        opLog.warn("Learn more at https://ayakashi.io/docs/guide/builtin-saving-scripts.html");
        return;
    }
    if (typeof extraction[0] !== "object") {
        opLog.warn("saveToSQL: invalid extraction format");
        opLog.warn("Learn more at https://ayakashi.io/docs/guide/builtin-saving-scripts.html");
        return;
    }
    let useDialect: "mysql" | "mariadb" | "postgres" | "mssql" | "sqlite";
    let useStorage = "";
    if (!params.dialect) {
        useDialect = "sqlite";
    } else {
        if (["mysql", "mariadb", "postgres", "mssql", "sqlite"].indexOf(params.dialect) === -1) {
            throw new Error(`Invalid sql dialect: ${params.dialect}`);
        } else {
            useDialect = params.dialect;
        }
    }
    if (useDialect === "sqlite") {
        const dataFolder = pathJoin(system.projectFolder, "data", system.startDate);
        await mkdirp(dataFolder);
        useStorage = pathJoin(dataFolder, params.database || "database.sqlite");
    }
    let sequelize;
    if (useStorage) {
        //@ts-ignore
        sequelize = new Sequelize({
            dialect: "sqlite",
            storage: useStorage,
            logging: false
        });
    } else {
        if (params.connectionURI) {
            //@ts-ignore
            sequelize = new Sequelize(params.connectionURI, {
                pool: {
                    max: 1,
                    min: 1
                },
                logging: false
            });
        } else {
            //@ts-ignore
            sequelize = new Sequelize(params.database, params.username, params.password, {
                dialect: params.dialect,
                host: params.host || "localhost",
                port: params.port,
                pool: {
                    max: 1,
                    min: 1
                },
                logging: false
            });
        }
    }
    const tableSchema: {
        [key: string]: Sequelize.DataType
    } = {};
    Object.entries(extraction[0]).forEach(function([col, row]) {
        if (typeof row === "string") {
            tableSchema[col] = Sequelize.STRING;
        } else if (typeof row === "boolean") {
            tableSchema[col] = Sequelize.BOOLEAN;
        } else if (typeof row === "number" && Number.isInteger(row)) {
            tableSchema[col] = Sequelize.INTEGER;
        } else if (typeof row === "number" && !Number.isInteger(row)) {
            tableSchema[col] = Sequelize.FLOAT;
        } else if (typeof row === "object" && row !== null) {
            if (useDialect === "sqlite" || useDialect === "postgres") {
                tableSchema[col] = Sequelize.JSON;
            } else {
                extraction.forEach(function(e) {
                    e[col] = JSON.stringify(e[col]);
                });
                tableSchema[col] = Sequelize.TEXT;
            }
        } else {
            tableSchema[col] = Sequelize.STRING;
        }
    });
    const table = sequelize.define(params.table || system.operationId, tableSchema, {
        timestamps: true,
        updatedAt: false,
        freezeTableName: true
    });
    await table.sync();
    await Promise.all(extraction.map(e => {
        return table.create(e);
    }));

    return input;
}
