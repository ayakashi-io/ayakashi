//@ts-ignore
import UserAgent from "user-agents";
import {EmulatorOptions} from "../runner/parseConfig";
import {UserAgentDataStatic} from "./sessionDb";
import {Sequelize} from "sequelize";

export type UserAgentDataType = {userAgent: string, platform: string, vendor: string};

export async function getUserAgentData(
    sessionDb: Sequelize,
    userAgentModel: UserAgentDataStatic,
    input: {
        agent: EmulatorOptions["userAgent"] | undefined,
        platform: EmulatorOptions["platform"] | undefined,
        persistentSession: boolean
    }
): Promise<UserAgentDataType> {
    if (input.persistentSession) {
        return sessionDb.transaction(async function(t) {
            //return the saved data if we have already persisted them
            const savedData = await userAgentModel.findOne({transaction: t});
            if (savedData) {
                return savedData.userAgentData;
            }
            //generate new data based on input
            const data = generate(input.agent, input.platform);
            //persist them
            await userAgentModel.create({
                userAgentData: data
            }, {
                transaction: t
            });
            return data;
        });
    } else {
        return generate(input.agent, input.platform);
    }
}

export function generate(
    agent: EmulatorOptions["userAgent"] | undefined,
    platform: EmulatorOptions["platform"] | undefined
): UserAgentDataType {
    try {
        if (agent === "random") {
            return (new UserAgent({
                platform: platform || "Win32"
            })).data;
        }
        if (agent === "desktop") {
            return (new UserAgent({
                deviceCategory: "desktop",
                platform: platform || "Win32"
            })).data;
        }
        if (agent === "mobile") {
            return (new UserAgent({
                deviceCategory: "mobile",
                platform: platform || "Linux armv8l"
            })).data;
        }
        if (agent === "chrome-desktop") {
            return (new UserAgent([
                /Chrome/,
                {
                    deviceCategory: "desktop",
                    platform: platform || "Win32"
                }
            ])).data;
        }
        if (agent === "chrome-mobile") {
            return (new UserAgent([
                /Chrome/,
                {
                    deviceCategory: "mobile",
                    platform: platform || "Linux armv8l"
                }
            ])).data;
        }

        //default to chrome-desktop
        return (new UserAgent([
            /Chrome/,
            {
                deviceCategory: "desktop",
                platform: platform || "Win32"
            }
        ])).data;
    } catch (_e) {
        //default to chrome-desktop on invalid input
        return (new UserAgent([
            /Chrome/,
            {
                deviceCategory: "desktop",
                platform: "Win32"
            }
        ])).data;
    }
}
