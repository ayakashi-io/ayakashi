import request from "@ayakashi/request";
import {createConnection, EmulatorOptions, IConnection} from "../engine/createConnection";
import {Target} from "../engine/createTarget";
import {prelude, IAyakashiInstance} from "../prelude/prelude";
import {attachYields} from "../prelude/actions/yield";
import {resolve as pathResolve} from "path";
import {PipeProc} from "pipeproc";
import {compile} from "../preloaderCompiler/compiler";
import {getOpLog} from "../opLog/opLog";
import {
    loadLocalActions,
    loadLocalExtractors,
    loadLocalPreloaders,
    loadLocalProps,
    loadExternalActions,
    loadExternalExtractors,
    loadExternalPreloaders
} from "./loaders";
import debug from "debug";
const d = debug("ayakashi:scrapperWrapper");

type PassedLog = {
    id: string,
    body: {
        input: object,
        params: object,
        config: {
            pipeConsole?: boolean,
            pipeExceptions?: boolean,
            localAutoLoad?: boolean,
            emulatorOptions?: EmulatorOptions,
            simple?: boolean
        },
        load: {
            extractors?: string[],
            actions?: string[],
            preloaders?: string[] | {
                module: string,
                as?: string,
                waitForDom?: boolean
            }[]
        },
        module: string,
        connectionConfig: {
            bridgePort: number,
            protocolPort: number
        },
        saveTopic: string,
        selfTopic: string,
        projectFolder: string,
        storeProjectFolder: string,
        persistentSession: boolean,
        operationId: string,
        startDate: string,
        procName: string,
        appRoot: string
    }
};

export default async function scrapperWrapper(log: PassedLog) {
    try {
        const opLog = getOpLog();
        opLog.info("running scrapper", log.body.module);
        //get a tab and create a connection
        let tab;
        try {
            tab = await getTarget(log.body.connectionConfig.bridgePort);
            if (!tab) {
                throw new Error("no_target");
            }
        } catch (e) {
            d(e);
            opLog.error("Could not create a chrome target");
            throw e;
        }

        let connection;
        try {
            connection = await createConnection(
                tab,
                log.body.connectionConfig.bridgePort,
                log.body.config.emulatorOptions
            );
            if (!connection) {
                throw new Error("no_connection");
            }
        } catch (e) {
            d(e);
            opLog.error("Could not create a connection");
            throw e;
        }

        //check pipes and initialize the instance using the prelude
        if (log.body.config.pipeConsole !== false) {
            connection.pipe.console(function(text) {
                if (text && text.indexOf("[Ayakashi]") === -1) {
                    opLog.debug(`<Scrapper:${log.body.module}:Browser>`, text);
                }
            });
        }
        if (log.body.config.pipeExceptions !== false) {
            connection.pipe.uncaughtException(function(exception) {
                opLog.debug(`<Scrapper:${log.body.module}:Browser:Exception>`, JSON.stringify(exception, null, 2));
            });
        }
        const ayakashiInstance = await prelude(connection);

        //connect to pipeproc
        const pipeprocClient = PipeProc();
        await pipeprocClient.connect({namespace: "ayakashi"});

        //attach the yield methods
        const yieldWatcher = {yieldedAtLeastOnce: false};
        attachYields(ayakashiInstance, pipeprocClient, log.body.saveTopic, log.body.selfTopic, yieldWatcher);

        //load domQL as a preloader
        const domqlPreloader = await compile(
            log.body.appRoot,
            `./lib/domQL/domQL`,
            "ayakashi",
            `${log.body.storeProjectFolder}/.cache/preloaders/`
        );
        await connection.injectPreloader({compiled: domqlPreloader, as: "domQL", waitForDOM: false});

        //load findCssSelector as a preloader
        const findCssSelectorPreloader = await compile(
            log.body.appRoot,
            `@ayakashi/get-node-selector`,
            "ayakashi",
            `${log.body.storeProjectFolder}/.cache/preloaders/`
        );
        await connection.injectPreloader({
            compiled: findCssSelectorPreloader,
            as: "getNodeSelector",
            waitForDOM: false
        });
        //load detection patches
        const detectionPatches = await compile(
            log.body.appRoot,
            "./lib/detection/patch",
            "ayakashi",
            `${log.body.storeProjectFolder}/.cache/preloaders/`
        );
        await connection.injectPreloader({
            compiled: detectionPatches,
            as: "detectionPatches",
            waitForDOM: false
        });

        //load external actions/extractors/preloaders
        await loadExternals(connection, ayakashiInstance, log);

        //autoLoad local actions/extractors/preloaders
        if (log.body.config.localAutoLoad !== false) {
            await loadLocals(connection, ayakashiInstance, log);
        }

        //activate the connection and load the scrapper
        await connection.activate();
        let scrapperModule;
        try {
            if (log.body.config.simple) {
                scrapperModule = require(pathResolve(log.body.projectFolder, log.body.module));
            } else {
                scrapperModule = require(pathResolve(log.body.projectFolder, "scrappers", log.body.module));
            }
            if (typeof scrapperModule !== "function") {
                scrapperModule = scrapperModule.default;
            }
            if (typeof scrapperModule !== "function") {
                throw new Error(`Scrapper <${log.body.module}> is not a function`);
            }
        } catch (e) {
            opLog.error(e.message);
            await connection.release();
            throw e;
        }
        //run the scrapper
        let result;
        try {
            //@ts-ignore
            if (log.body.input && log.body.input.continue === true) delete log.body.input.continue;
            result = await scrapperModule(ayakashiInstance, log.body.input || {}, log.body.params || {});
        } catch (e) {
            opLog.error(`There was an error while running scrapper <${log.body.module}> -`, e.message, e.stack);
            await connection.release();
            throw e;
        }
        if (result) {
            await ayakashiInstance.yield(result);
        }
        if (!result && !yieldWatcher.yieldedAtLeastOnce) {
            await ayakashiInstance.yield({continue: true});
        }
        await connection.release();
    } catch (e) {
        d(e);
        throw e;
    }
}

async function getTarget(port: number): Promise<Target | null> {
    const resp = await request.post(`http://localhost:${port}/create_target`);
    d("bridge response:", resp);
    if (resp) {
        const parsedResp = JSON.parse(resp);
        if (parsedResp.ok) {
            return parsedResp.target;
        } else {
            return null;
        }
    } else {
        return null;
    }
}

async function loadExternals(
    connection: IConnection,
    ayakashiInstance: IAyakashiInstance,
    log: PassedLog
) {
    loadExternalActions(ayakashiInstance, log.body.load.actions);
    loadExternalExtractors(ayakashiInstance, log.body.load.extractors);
    await loadExternalPreloaders(
        connection,
        log.body.projectFolder,
        log.body.storeProjectFolder,
        log.body.load.preloaders
    );
}

async function loadLocals(
    connection: IConnection,
    ayakashiInstance: IAyakashiInstance,
    log: PassedLog
) {
    loadLocalProps(ayakashiInstance, log.body.projectFolder);
    loadLocalActions(ayakashiInstance, log.body.projectFolder);
    loadLocalExtractors(ayakashiInstance, log.body.projectFolder);
    await loadLocalPreloaders(connection, log.body.projectFolder, log.body.storeProjectFolder);
}
