//tslint:disable
import "jest-extended";
//tslint:enable
import {getInstance, IHeadlessChrome} from "../../src/engine/browser";
import {getChromePath} from "../../src/store/chromium";
import {getRandomPort} from "../../src/utils/getRandomPort";
import {getAyakashiInstance} from "../utils/getAyakashiInstance";
import {startBridge} from "../../src/bridge/bridge";
import {addConnectionRoutes} from "../../src/bridge/connection";
import {generate} from "../../src/sessionDb/userAgent";

let headlessChrome: IHeadlessChrome;
let bridgePort: number;
let protocolPort: number;
let closeBridge: () => Promise<void>;

jest.setTimeout(600000);
process.setMaxListeners(100);

describe("detection check tests", function() {
    let chromePath: string;

    beforeAll(async function() {
        chromePath = await getChromePath();
    });

    beforeEach(async function() {
        headlessChrome = getInstance();
        bridgePort = await getRandomPort();
        protocolPort = await getRandomPort();
        const b = await startBridge(bridgePort);
        closeBridge = b.closeBridge;
        addConnectionRoutes(b.bridge, headlessChrome);
        await headlessChrome.init({
            chromePath: chromePath,
            protocolPort: protocolPort
        });
    });

    afterEach(async function() {
        await headlessChrome.close();
        await closeBridge();
    });

    test("it passes all checks", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort, false);
        const userAgentData = generate(undefined, undefined);
        await ayakashiInstance.__connection.client.Emulation.setUserAgentOverride({
            userAgent: userAgentData.userAgent,
            platform: userAgentData.platform,
            acceptLanguage: "en-US"
        });
        await ayakashiInstance.goTo("https://bot.sannysoft.com/");

        ayakashiInstance
            .select("fails")
            .where({className: {eq: "failed"}});

        ayakashiInstance
            .select("container")
            .where({id: {eq: "fp2"}})
            .selectChildren("table")
            .where({tagName: {eq: "td"}});

        ayakashiInstance.selectOne("brokenImage").where({src: {like: "nonexistent"}});

        await ayakashiInstance.waitUntilVisible("container");
        await ayakashiInstance.waitUntilVisible("brokenImage");

        const fails = await ayakashiInstance.extract("fails", "id");
        expect(fails).toBeEmpty();

        const table = await ayakashiInstance.extract("table");
        const formattedTable: string[][] = [];
        let lastEl: string[] = [];
        for (let t of table) {
            if (t.includes("{")) t = JSON.parse(t);
            if (lastEl.length === 3) {
                formattedTable.push(lastEl);
                lastEl = [];
            }
            lastEl.push(t);
        }
        for (const t of formattedTable) {
            expect(t[1]).toBe("ok");
        }

        await ayakashiInstance.__connection.release();
    });
});
