import request from "request-promise-native";
const packageJson = require("../../package.json");

type Manifest = {
    chromium: {
        revision: number
    },
    ayakashi: {
        version: string
    }
};

export async function getManifest(): Promise<Manifest> {
    //tslint:disable
    let manifest = {
        chromium: {
            revision: 0
        },
        ayakashi: {
            version: "0.0.0"
        }
    };
    try {
        const resp = await request
        .get(`https://ayakashi.io/manifest.json?platform=${process.platform}&arch=${process.arch}&version=${packageJson.version}&test=${process.env.NODE_ENV === "test"}`);
        if (resp) {
            try {
                manifest = JSON.parse(resp);
            } catch (_e) {}
            return manifest;
        } else {
            return manifest;
        }
    } catch (_e) {
        return manifest;
    }
    //tslint:enable
}
