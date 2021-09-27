import _mkdirp from "mkdirp";
import {promisify} from "util";
import {
    writeFile as _writeFile,
    readdir as _readdir
} from "fs";
import {exec} from "child_process";
import {getOpLog} from "../../opLog/opLog";

import {generateScraper} from "./generateScraper";
import {generateScript} from "./generateScript";

const mkdirp = promisify(_mkdirp);
const writeFile = promisify(_writeFile);
const readdir = promisify(_readdir);

export async function generateProject(projectDir: string, useCurrentFolder: boolean) {
    const opLog = getOpLog();
    try {
        const filesInDir = await readdir(projectDir);
        if (filesInDir.length > 0) {
            opLog.error(`${projectDir} is not empty`);
            return;
        }
    } catch (_e) {}
    if (!useCurrentFolder) {
        await mkdirp(projectDir);
    }
    process.chdir(projectDir);
    opLog.info(`creating new project in ${projectDir}`);
    opLog.info("generating config file");
    await writeFile("ayakashi.config.js", getConfig());
    opLog.info("generating package.json");
    await writeFile("package.json", getpackageJson());
    opLog.info("generating Dockerfile");
    await writeFile("Dockerfile", getDockerfile())
    await writeFile("chromium-wrapper.sh", getChromiumWrapper())
    await writeFile(".dockerignore", getDockerIgnore())
    await generateScraper(projectDir, "githubAbout");
    await generateScript(projectDir, "getPage");
    await writeFile(".gitignore", getGitIgnore());
    let npm = "npm";
    if (process.platform === "win32") {
        npm = "npm.cmd";
    }
    await runNpmInstall(npm);
    opLog.messageBox([
        "Your project is ready!",
        "Get started:",
        "https://ayakashi.io/docs/getting_started",
        "",
        "You may run your new project with:",
        "ayakashi run"
    ]);

}

function getConfig() {
    return (
`/**
* @type {import("@ayakashi/types").Config}
*/
module.exports = {
    config: {},
    waterfall: [{
        type: "script",
        module: "getPage"
    }, {
        type: "scraper",
        module: "githubAbout"
    }, {
        type: "script",
        module: "printToConsole"
    }]
};
`);
}

function getpackageJson() {
    return (
`{
    "name": "my-project",
    "version": "1.0.0",
    "description": "An ayakashi project",
    "homepage": "https://ayakashi.io",
    "main": "ayakashi.config.js",
    "keywords": [
      "ayakashi"
    ],
    "scripts": {
      "start": "ayakashi run"
    },
    "author": "",
    "license": "ISC",
    "dependencies": {
      "@ayakashi/types": "^1.0.0-beta1"
    }
  }
`);
}

function getGitIgnore() {
    return (
`node_modules
`);
}

function getDockerfile() {
    return (
`FROM node:14-slim

# install dependencies
RUN apt-get update --fix-missing && \\
    apt-get -y upgrade \\
    wget \\
    gnupg2 \\
    procps \\
    chromium

# configure user
RUN groupadd --system ayakashi && \\
    useradd --system --create-home --gid ayakashi --groups audio,video ayakashi && \\
    chown --recursive ayakashi:ayakashi /home/ayakashi
USER ayakashi
WORKDIR /home/ayakashi/project

# copy project and install dependencies
COPY . .
RUN npm install

# configure chromium container compatibility wrapper 
COPY --chown=ayakashi:ayakashi chromium-wrapper.sh /home/ayakashi/.ayakashi/chromium/chrome-linux/chrome
RUN chmod +x /home/ayakashi/.ayakashi/chromium/chrome-linux/chrome

CMD ["npx", "ayakashi", "run"]
`);
}

function getDockerIgnore() {
    return (
`**/node_modules
`);
}

function getChromiumWrapper() {
    return (
`#!/bin/bash

chromium \\
  --headless \\
  --disable-gpu \\
  --remote-debugging-port=9730 \\
  --remote-debugging-address=0.0.0.0 \\
  --no-sandbox \\
  --disable-software-rasterizer
`);
}

function runNpmInstall(npm: string) {
    const opLog = getOpLog();
    const waiter = opLog.waiter("installing dependencies");
    return new Promise<void>(function(resolve) {
        exec(`${npm} install`, function(err) {
            if (err) {
                waiter.fail("failed to run npm install, please run it manually");
                console.error(err.message);
            } else {
                waiter.succeed("dependencies installed!");
            }
            resolve();
        });
    });
}
