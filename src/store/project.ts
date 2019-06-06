import mkdirp from "mkdirp";
import {createHash} from "crypto";
import {resolve as pathResolve} from "path";
import {getStoreDir} from "./store";

export async function getOrCreateStoreProjectFolder(projectFolderOrScrapperName: string): Promise<string> {
    const storeDir = await getStoreDir();
    const folderName = createHash("md5").update(projectFolderOrScrapperName).digest("hex");
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
