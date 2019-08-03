import mkdirp from "mkdirp";
import {createHash} from "crypto";
import {resolve as pathResolve, join as pathJoin} from "path";
import {getStoreDir} from "./store";
import {exists} from "fs";
import rimraf from "rimraf";

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

export function clearPreviousRun(projectFolderOrScraperName: string): Promise<boolean> {
    return new Promise(function(resolve) {
        rimraf(getPipeprocFolder(projectFolderOrScraperName), function(_err) {
            resolve();
        });
    });
}

export function getPipeprocFolder(projectFolderOrScraperName: string): string {
    return pathJoin(projectFolderOrScraperName, "pipeproc");
}
