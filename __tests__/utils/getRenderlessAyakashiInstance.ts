import {renderlessPrelude} from "../../src/prelude/renderlessPrelude";
import request from "request-promise-native";
import {JSDOM} from "jsdom";

export async function getAyakashiInstance() {
    const ayakashiInstance = await renderlessPrelude();

    ayakashiInstance.load = async function(url, timeout) {
        const html = await request.get(url, {
            timeout: timeout || 10000
        });
        if (html) {
            this.attachDOM(new JSDOM(html));
        } else {
            throw new Error("Invalid page");
        }
    };

    return ayakashiInstance;
}
