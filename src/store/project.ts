import mkdirp from "mkdirp";
import {createHash} from "crypto";
import {resolve as pathResolve, join as pathJoin} from "path";
import {getStoreDir} from "./store";
import {exists, writeFile, readFile} from "fs";
import rimraf from "rimraf";
import {Config} from "../runner/parseConfig";
import {isEqual} from "lodash";

export async function getOrCreateStoreProjectFolder(projectFolderOrScraperName: string): Promise<string> {
    const storeDir = await getStoreDir();
    const folderName = createHash("md5").update(projectFolderOrScraperName).digest("hex");
    const fullFolder = pathResolve(storeDir, "projects", folderName);
    return new Promise(function(resolve, reject) {
        mkdirp(fullFolder, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(fullFolder);
            }
        });
    });
}

export function hasPreviousRun(projectFolderOrScraperName: string): Promise<boolean> {
    return new Promise(function(resolve) {
        exists(getPipeprocFolder(projectFolderOrScraperName), function(ex) {
            resolve(ex);
        });
    });
}

export function clearPreviousRun(projectFolderOrScraperName: string): Promise<void> {
    return new Promise(function(resolve) {
        rimraf(getPipeprocFolder(projectFolderOrScraperName), function(_err) {
            resolve();
        });
    });
}

export function getPipeprocFolder(projectFolderOrScraperName: string): string {
    return pathJoin(projectFolderOrScraperName, "pipeproc");
}

export async function saveLastConfig(config: Config, storeProjectFolder: string): Promise<void> {
    return new Promise(function(resolve, reject) {
        writeFile(pathResolve(storeProjectFolder, "lastConfig.json"), JSON.stringify(config), "utf8", function(err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

export async function getLastConfig(storeProjectFolder: string): Promise<string> {
    return new Promise(function(resolve, reject) {
        readFile(pathResolve(storeProjectFolder, "lastConfig.json"), "utf8", function(err, content) {
            if (err) {
                reject(err);
            } else {
                resolve(content);
            }
        });
    });
}

export async function configChanged(config: Config, storeProjectFolder: string): Promise<boolean> {
    const lastConfig = JSON.parse(await getLastConfig(storeProjectFolder));
    return !isEqual(lastConfig, config);
}
