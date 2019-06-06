import {IHeadlessChrome} from "../../src/engine/browser";
import {createConnection} from "../../src/engine/createConnection";
import {prelude} from "../../src/prelude/prelude";
import {compile} from "../../src/preloaderCompiler/compiler";
import {resolve as pathResolve, join as pathJoin} from "path";
import mkdirp from "mkdirp";
import {tmpdir} from "os";

export async function getAyakashiInstance(
    headlessChrome: IHeadlessChrome,
    bridgePort: number
) {
    const target = await headlessChrome.createTarget();
    if (!target) throw new Error("no_target");
    const connection = await createConnection(target.tab, bridgePort);
    if (!connection) throw new Error("no_connection");
    const ayakashiInstance = await prelude(connection);
    mkdirp.sync(pathJoin(tmpdir(), "ayakashi-test-cache"));
    const domqlPreloader = await compile(
        pathResolve(".", "lib"),
        `./domQL/domQL`,
        "ayakashi",
        pathJoin(tmpdir(), "ayakashi-test-cache")
    );
    await connection.injectPreloader({compiled: domqlPreloader, as: "domQL", waitForDOM: false});
    const findCssSelectorPreloader = await compile(
        pathResolve(".", "lib"),
        `@ayakashi/get-node-selector`,
        "ayakashi",
        pathJoin(tmpdir(), "ayakashi-test-cache")
    );
    await connection.injectPreloader({
        compiled: findCssSelectorPreloader,
        as: "getNodeSelector",
        waitForDOM: false
    });
    const detectionPatches = await compile(
        pathResolve(".", "lib"),
        "./detection/patch",
        "ayakashi",
        pathJoin(tmpdir(), "ayakashi-test-cache")
    );
    await connection.injectPreloader({
        compiled: detectionPatches,
        as: "detectionPatches",
        waitForDOM: false
    });
    connection.pipe.console(console.log);
    connection.pipe.uncaughtException(console.error);
    await connection.activate();

    return ayakashiInstance;
}
