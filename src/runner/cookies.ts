import {Cookie} from "tough-cookie";
import {CookieJar, jar} from "@ayakashi/request/core";
import {getCookieUrl, toCookieString, getAllCookiesFromRequestJar} from "../utils/cookieStore";
import {getBridgeClient} from "../bridge/client";

//tslint:disable interface-name variable-name
export async function getCookieJar(
    port: number,
    options: {persistentSession: boolean}
): Promise<{jar: CookieJar, cookies: Cookie[]}> {
    if (options.persistentSession) {
        const bridgeClient = getBridgeClient(port);
        //create a new memory jar and add any cookies we have on the persistent store to it
        const memJar = jar();
        const cookies = await bridgeClient.getCookieJar();
        return new Promise(function(resolve, _reject) {
            cookies.forEach(function(cookie) {
                memJar.setCookie(toCookieString(cookie), getCookieUrl(cookie), {
                    now: new Date(cookie.creation),
                    ignoreError: true
                });
            });
            resolve({jar: memJar, cookies: <Cookie[]>cookies});
        });
    } else {
        //just return a new memory jar
        return {jar: jar(), cookies: []};
    }
}

export async function updateCookieJar(port: number, memJar: CookieJar, options: {persistentSession: boolean}) {
    if (!options.persistentSession) return;
    const bridgeClient = getBridgeClient(port);
    const cookies = getAllCookiesFromRequestJar(memJar);
    await bridgeClient.updateCookieJar(cookies);
}
