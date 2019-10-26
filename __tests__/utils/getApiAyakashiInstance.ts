import {apiPrelude} from "../../src/prelude/apiPrelude";
import {attachRequest} from "../../src/prelude/actions/request";
import request from "@ayakashi/request/core";

export function getAyakashiInstance() {
    const ayakashiInstance = apiPrelude();

    const myRequest = request.defaults({
        headers: {
            "User-Agent": "test agent",
            //tslint:disable max-line-length
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3",
            //tslint:enable max-line-length
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "no-cache",
            pragma: "no-cache"
        },
        gzipOrBrotli: true
    });

    attachRequest(ayakashiInstance, myRequest, async function() {});

    return ayakashiInstance;
}
