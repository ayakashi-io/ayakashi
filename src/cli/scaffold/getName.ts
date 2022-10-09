import prompts from "prompts";
import {camelCase} from "lodash";
import {getOpLog} from "../../opLog/opLog";

const opLog = getOpLog();

export async function getName(name: unknown, typeForQuestion: string): Promise<string> {
    if (name && typeof name === "string") {
        return name;
    } else {
        const response = await prompts({
            type: "text",
            name: "answer",
            message: `Enter a name for the new ${typeForQuestion}`
        });
        if (!response.answer) {
            opLog.error(`Enter a name for the new ${typeForQuestion} to continue`);
            process.exit(1);
        }
        return camelCase(response.answer.replace(/[.]js|[.]ts/, ""));
    }
}
