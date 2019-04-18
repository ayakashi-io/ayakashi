import chalk from "chalk";
import dayjs from "dayjs";

export function consoleWrap(moduleType: string, moduleName: string) {
    //tslint:disable no-any
    console.log = function(...args: any[]) {
        process.stdout.write(
            chalk.underline.white(`[${dayjs().format("HH:mm:ss")}]`) + " " +
            chalk.white(`<${moduleType}:${moduleName}>`) + " " +
            args.map(arg => typeof arg === "object" ? JSON.stringify(arg) : arg).join(" ") + "\n"
        );
    };
    console.info = function(...args: any[]) {
        process.stdout.write(
            chalk.underline.white(`[${dayjs().format("HH:mm:ss")}]`) + " " +
            chalk.cyan(`<${moduleType}:${moduleName}>`) + " " +
            args.map(arg => typeof arg === "object" ? JSON.stringify(arg) : arg).join(" ") + "\n"
        );
    };
    console.warn = function(...args: any[]) {
        process.stdout.write(
            chalk.underline.white(`[${dayjs().format("HH:mm:ss")}]`) + " " +
            chalk.yellow(`<${moduleType}:${moduleName}>`) + " " +
            args.map(arg => typeof arg === "object" ? JSON.stringify(arg) : arg).join(" ") + "\n"
        );
    };
    console.error = function(...args: any[]) {
        process.stdout.write(
            chalk.underline.white(`[${dayjs().format("HH:mm:ss")}]`) + " " +
            chalk.red(`<${moduleType}:${moduleName}>`) + " " +
            args.map(arg => typeof arg === "object" ? JSON.stringify(arg) : arg).join(" ") + "\n"
        );
    };
    //tslint:enable no-any
}
