import request from "request-promise-native";
const packageJson = require("../../package.json");

export async function getManifest() {
    //tslint:disable
    const resp = await request
        .get(`https://ayakashi.io/manifest.json?platform=${process.platform}&arch=${process.arch}&version=${packageJson.version}`);
    if (resp) {
        const parsedResp: {
            chromium: {
                revision: number
            },
            ayakashi: {
                version: string
            }
        } = JSON.parse(resp);
        if (parsedResp) {
            return parsedResp;
        } else {
            throw new Error("Could not download manifest");
        }
    } else {
        throw new Error("Could not download manifest");
    }
    //tslint:enable
}
