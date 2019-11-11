//tslint:disable
import "jest-extended";
//tslint:enable
import {getInstance, IHeadlessChrome} from "../../src/engine/browser";
import {getChromePath} from "../../src/store/chromium";

import {getRandomPort} from "../../src/utils/getRandomPort";

let headlessChrome: IHeadlessChrome;

jest.setTimeout(600000);
process.setMaxListeners(100);

describe("launcher tests", function() {
    let chromePath: string;
    beforeAll(async function() {
        chromePath = await getChromePath();
    });

    afterEach(async function() {
        await headlessChrome.close();
    });

    test("it can launch", async function() {
        headlessChrome = getInstance();
        await headlessChrome.init({
            chromePath: chromePath,
            protocolPort: await getRandomPort()
        });
    });

    test("it should throw if options object is not passed", async function() {
        headlessChrome = getInstance();
        expect((async function() {
            //@ts-ignore
            await headlessChrome.init();
        })()).rejects.toThrowError("init_options_not_set");
    });

    test("it should throw if chromePath is not passed", async function() {
        headlessChrome = getInstance();
        expect((async function() {
            //@ts-ignore
            await headlessChrome.init({});
        })()).rejects.toThrowError("chrome_path_not_set");
    });
});
