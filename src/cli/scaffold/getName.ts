import {createInterface} from "readline";

export function getName(name: unknown, typeForQuestion: string): Promise<string> {
    return new Promise(function(resolve) {
        if (name && typeof name === "string") {
            resolve(name);
        } else {
            const rl = createInterface({
                input: process.stdin,
                output: process.stdout
            });
            rl.question(`Enter a name for the new ${typeForQuestion}: `, (answer) => {
                resolve(answer);
                rl.close();
            });
        }
    });
}
