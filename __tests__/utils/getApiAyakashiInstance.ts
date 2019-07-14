import {apiPrelude} from "../../src/prelude/apiPrelude";
import request from "@ayakashi/request";

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
        gzipOrBrotli: true,
        resolveWithFullResponse: true,
        simple: false
    });

    ayakashiInstance.__wrap(myRequest, ["get", "post", "put", "patch", "delete", "head"]);

    return ayakashiInstance;
}
