import {homedir} from "os";
import mkdirp from "mkdirp";

export function getStoreDir(): Promise<string> {
    let storeDir = `${homedir()}/.ayakashi`;
    if (process.platform === "win32") {
        storeDir = storeDir.replace(/\\/g, "/");
    }
    return new Promise(function(resolve, reject) {
        mkdirp(storeDir, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(storeDir);
            }
        });
    });
}
