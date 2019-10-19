import {Cookie, CookieJar as JarStore} from "tough-cookie";
import {CookieJar, jar} from "@ayakashi/request/core";
import {getCookieUrl} from "../utils/cookieStore";
import {getBridgeClient} from "../bridge/client";

//tslint:disable interface-name variable-name
export async function getCookieJar(port: number, options: {persistentSession: boolean}): Promise<CookieJar> {
    if (options.persistentSession) {
        const bridgeClient = getBridgeClient(port);
        //create a new memory jar and add any cookies we have on the persistent store to it
        const memJar = jar();
        const cookies = await bridgeClient.getCookieJar();
        return new Promise(function(resolve, _reject) {
            cookies.forEach(function(cookie) {
                memJar.setCookie(String(Cookie.fromJSON(cookie)), getCookieUrl(<Cookie>cookie), {
                    now: new Date(cookie.creation),
                    ignoreError: true
                });
            });
            resolve(memJar);
        });
    } else {
        //just return a new memory jar
        return jar();
    }
}

export async function updateCookieJar(port: number, memJar: CookieJar, options: {persistentSession: boolean}) {
    if (!options.persistentSession) return;
    const bridgeClient = getBridgeClient(port);
    //@ts-ignore
    const memStore: JarStore = memJar._jar;
    const cookies = memStore.serializeSync().cookies;
    await bridgeClient.updateCookieJar(cookies);
}
