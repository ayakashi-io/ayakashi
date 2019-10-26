import request from "@ayakashi/request";
import {Target} from "../engine/createTarget";
import {UserAgentDataType} from "../sessionDb/userAgent";
import {EmulatorOptions} from "../runner/parseConfig";
import {Cookie} from "tough-cookie";
import debug from "debug";

const d = debug("ayakashi:bridge:client");

export function getBridgeClient(port: number) {
    return {
        getTarget: async function(): Promise<Target | null> {
            try {
                const resp = await request.post(`http://localhost:${port}/connection/create_target`);
                d("getTarget response:", resp);
                if (resp) {
                    const parsedResp: {ok: boolean, target: Target} = JSON.parse(resp);
                    if (parsedResp.ok) {
                        return parsedResp.target;
                    } else {
                        return null;
                    }
                } else {
                    return null;
                }
            } catch (e) {
                d(e);
                return null;
            }
        },
        getUserAgentData: async function(input: {
            agent: EmulatorOptions["userAgent"] | undefined,
            platform: EmulatorOptions["platform"] | undefined,
            persistentSession: boolean
        }): Promise<UserAgentDataType | null> {
            try {
                const resp: {ok: boolean, userAgentData: UserAgentDataType} = await request.post(`http://localhost:${port}/user_agent`, {json: input});
                d("getUserAgentData response:", resp);
                if (resp) {
                    if (resp.ok) {
                        return resp.userAgentData;
                    } else {
                        return null;
                    }
                } else {
                    return null;
                }
            } catch (e) {
                d(e);
                return null;
            }
        },
        connectionReleased: async function(target: Target): Promise<void> {
            await request.post(`http://localhost:${port}/connection/released`, {
                json: {
                    targetId: target.targetId,
                    browserContextId: target.browserContextId
                }
            });
        },
        getCookieJar: async function(): Promise<Cookie[]> {
            try {
                const resp = await request.post(`http://localhost:${port}/cookies/get_jar`);
                d("get_jar response:", resp);
                if (resp) {
                    const parsedResp: {ok: boolean, cookies: Cookie.Serialized[]} = JSON.parse(resp);
                    if (parsedResp.ok) {
                        return parsedResp.cookies
                            .map(function(cookie) {
                                return Cookie.fromJSON(cookie);
                            })
                            .filter(function(cookie) {
                                return cookie !== null;
                            }) as Cookie[];
                    } else {
                        return [];
                    }
                } else {
                    return [];
                }
            } catch (e) {
                d(e);
                return [];
            }
        },
        updateCookieJar: async function(cookies: Cookie[]): Promise<void> {
            try {
                await request.post(`http://localhost:${port}/cookies/update_jar`, {
                    json: {
                        cookies: cookies.map(cookie => cookie.toJSON())
                    }
                });
            } catch (e) {
                d(e);
            }
        }
    };
}
