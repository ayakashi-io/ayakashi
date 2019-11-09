import {Config} from "../../src/runner/parseConfig";

export function stringifyConfig(config: Config): string {
    let strConfig: string;
    if (process.platform === "win32") {
        strConfig = JSON.stringify(config).replace(/"/g, `\\"`);
    } else {
        strConfig = JSON.stringify(config);
    }

    return strConfig;
}
