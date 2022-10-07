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

describe("areyouHeadless tests", function() {
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

    test("i should not be", async function() {
        const ayakashiInstance = await getAyakashiInstance(headlessChrome, bridgePort, false);
        const userAgentData = generate(undefined, undefined);
        await ayakashiInstance.__connection.client.Emulation.setUserAgentOverride({
            userAgent: userAgentData.userAgent,
            platform: userAgentData.platform,
            acceptLanguage: "en-US"
        });
        await ayakashiInstance.goTo("https://arh.antoinevastel.com/bots/areyouheadless");

        ayakashiInstance.select("areYou").where({id: {eq: "res"}});

        await ayakashiInstance.waitUntilVisible("areYou");

        const areYou = await ayakashiInstance.extractFirst("areYou");

        expect(areYou).toBe("You are not Chrome headless");

        await ayakashiInstance.__connection.release();
    });
});
