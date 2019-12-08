import {IAyakashiInstance} from "../prelude";
import {IRenderlessAyakashiInstance} from "../renderlessPrelude";
import {IApiAyakashiInstance} from "../apiPrelude";

type valueof<T> = T extends (infer U)[] ? U : T;

export interface IJoinActions {
/**
 * Groups together multiple sets of related data.
 * Learn more here: https://ayakashi.io/docs/guide/data-extraction.html#grouping-extracted-data
*/
    join: <T>(obj: T) => {[P in keyof T]: valueof<T[P]>}[];
}

export function attachJoinActions(
    ayakashiInstance: IAyakashiInstance | IRenderlessAyakashiInstance | IApiAyakashiInstance
) {
    //@ts-ignore
    ayakashiInstance.join = function(obj) {
        if (!obj || typeof obj !== "object" || Object.keys(obj).length === 0) {
            throw new Error("Invalid object");
        }
        //get the max value length
        let max = 0;
        for (const val of Object.values(obj)) {
            if (Array.isArray(val)) {
                if (val.length > max) {
                    max = val.length;
                }
            }
        }
        //verify that all values' length equal the max
        for (const [key, val] of Object.entries(obj)) {
            if (Array.isArray(val) && val.length !== max) {
                throw new Error(`Property <${key}> does not have the correct length`);
            }
        }
        //if we have empty values return an empty array
        for (const val of Object.values(obj)) {
            if (Array.isArray(val) && val.length === 0) {
                return [];
            }
        }
        //save all non-arrays
        const nonArrays = [];
        for (const [key, val] of Object.entries(obj)) {
            if (!Array.isArray(val)) {
                nonArrays.push({
                    [key]: val
                });
            }
        }
        //check if we only have non-array values
        if (max === 0) {
            let j = {};
            if (nonArrays.length > 0) {
                for (const nonArray of nonArrays) {
                    j = {...j, ...nonArray};
                }
            }

            return [j];
        } else {
            //create the joined value
            const joined = [];
            for (let i = 0; i < max; i += 1) {
                let j = {};
                for (const [key, val] of Object.entries(obj)) {
                    if (Array.isArray(val)) {
                        //@ts-ignore
                        j[key] = val[i];
                    }
                }
                //merge non-arrays
                if (nonArrays.length > 0) {
                    for (const nonArray of nonArrays) {
                        j = {...j, ...nonArray};
                    }
                }
                joined.push(j);
            }

            return joined;
        }
    };
}
