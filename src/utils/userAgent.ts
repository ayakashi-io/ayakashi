//@ts-ignore
import UserAgent from "user-agents";
import {EmulatorOptions} from "../runner/parseConfig";

export function getUserAgentData(
    agent: EmulatorOptions["userAgent"] | undefined,
    platform: EmulatorOptions["platform"] | undefined
): {userAgent: string, platform: string, vendor: string} {
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
