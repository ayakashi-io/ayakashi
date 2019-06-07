import chalk from "chalk";
import dayjs from "dayjs";
import ora from "ora";
import boxen from "boxen";
import {EOL} from "os";

export function getOpLog() {
    const env = process.env.NODE_ENV;
    return {
        info: function(...logs: string[]) {
            if (env === "test") return;
            process.stdout.write(formatLogs(logs, "info"));
        },
        warn: function(...logs: string[]) {
            if (env === "test") return;
            process.stdout.write(formatLogs(logs, "warning"));
        },
        error: function(...logs: string[]) {
            if (env === "test") return;
            process.stdout.write(formatLogs(logs, "error"));
        },
        debug: function(...logs: string[]) {
            if (env === "test") return;
            process.stdout.write(formatLogs(logs, "debug"));
        },
        waiter: function(text: string) {
            return ora({
                color: "green",
                text: `${text}\n`,
                spinner: "triangle"
            }).start();
        },
        messageBox: function(logs: string[], opts?: {color?: string, margin?: number}) {
            if (env === "test") return;
            process.stdout.write(boxen(
                logs.reduce((msg, log) => msg + log + "\n", ""),
                {
                    borderColor: (opts && opts.color) || "cyan",
                    align: "center",
                    padding: 1,
                    borderStyle: boxen.BorderStyle.Double,
                    margin: (opts && opts.margin) || 0
                    // float: "center"
                }
            ) + "\n");
        },
        incrementalMessageBox: function(
            opts?: {color?: string, margin?: number}
        ): {_logs: string[], add: (text: string | string[]) => void, render: () => void} {
            return {
                _logs: [],
                add: function(text) {
                    if (Array.isArray(text)) {
                        this._logs = this._logs.concat(text);
                    } else {
                        this._logs.push(text);
                    }
                },
                render: function() {
                    if (this._logs.length === 0) return;
                    process.stdout.write(boxen(
                        this._logs.reduce((msg, log) => msg + log + "\n", ""),
                        {
                            borderColor: (opts && opts.color) || "cyan",
                            align: "center",
                            padding: 1,
                            borderStyle: boxen.BorderStyle.Double,
                            margin: (opts && opts.margin) || 0
                            // float: "center"
                        }
                    ) + "\n");
                }
            };
        }
    };
}

function formatLogs(logs: string[], level: "info" | "warning" | "error" | "debug") {
    return logs.reduce(function(acc, log) {
        if (level === "info") {
            return `${acc} ${chalk.cyan(log)}`;
        } else if (level === "warning") {
            return `${acc} ${chalk.yellow(log)}`;
        } else if (level === "error") {
            return `${acc} ${chalk.red(log)}`;
        } else {
            return `${acc} ${chalk.gray(log)}`;
        }
    }, chalk.underline.white(`[${dayjs().format("HH:mm:ss")}]`)) + EOL;
}
