import {homedir} from "os";
import mkdirp from "mkdirp";

export function getStoreDir(): Promise<string> {
    const storeDir = `${homedir()}/.ayakashi`;
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
