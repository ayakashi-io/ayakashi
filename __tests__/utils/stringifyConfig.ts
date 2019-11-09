import {Config} from "../../src/runner/parseConfig";

export function stringifyConfig(config: Config): string {
    const strConfig = JSON.stringify(config);
    return Buffer.from(strConfig.toString()).toString("base64");
}
