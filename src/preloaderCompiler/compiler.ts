import browserify from "browserify";
//@ts-ignore
import browserifyInc from "browserify-incremental";
import resolveFrom from "resolve-from";
import {createHash} from "crypto";
import {join as pathJoin, sep} from "path";
import {sync as mkdirp} from "mkdirp";

import debug from "debug";
const d = debug("ayakashi:preloaderCompiler");

export function compile(
    workingDir: string,
    entry: string,
    namespace: string,
    cacheFolder: string,
    useFileName: boolean,
    noCache?: boolean
): Promise<{wrapper: string, source: string}> {
    if (!entry || (typeof entry !== "string" && typeof entry !== "function")) {
        return Promise.reject(new Error("invalid_compilation_target"));
    }
    if (!namespace || typeof namespace !== "string") return Promise.reject(new Error("invalid_namespace"));
    if ((!cacheFolder || typeof namespace !== "string") && !noCache)
        return Promise.reject(new Error("invalid_cache_folder"));
    const input = resolveFrom.silent(workingDir, entry);
    if (!input) return Promise.reject(`Could not resolve module ${entry}`);
    const cacheFileName = createHash("sha1").update(input).digest("hex");
    let wrapperName: string;
    if (useFileName) {
        wrapperName = input.split(sep)[input.split(sep).length - 1];
        wrapperName = wrapperName.split(".")[0];
    } else {
        wrapperName = entry;
    }
    return new Promise(function(res, rej) {
        const b = browserify(
            Object.assign(
                {},
                JSON.parse(JSON.stringify(browserifyInc.args)),
                {standalone: `${namespace}__${wrapperName}`}
            )
        );
        if (noCache) {
            d("not using preloader cache");
        } else {
            mkdirp(cacheFolder);
            browserifyInc(b, {cacheFile: pathJoin(cacheFolder, `${cacheFileName}.json`)});
            b.once("time", function(ms) {
                d(`compiled ${input} in ${ms}ms with sha1 ${cacheFileName}`);
            });
        }
        b.add(input);
        b.bundle(function(err, buff) {
            if (err) {
                rej(err);
            } else {
                res({
                    wrapper: wrapperName,
                    source: buff.toString()
                });
            }
        })
        .once("error", function(err) {
            rej(err);
        });
    });
}
