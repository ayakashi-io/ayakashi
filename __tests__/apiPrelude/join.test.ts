//tslint:disable
import "jest-extended";
//tslint:enable
import {getAyakashiInstance} from "../utils/getApiAyakashiInstance";

describe("join() tests", function() {
    test("can use join()", function() {
        const ayakashiInstance = getAyakashiInstance();
        expect(ayakashiInstance.join({
            data1: [1, 2],
            data2: ["test1", "test2"]
        })).toEqual([{
            data1: 1,
            data2: "test1"
        }, {
            data1: 2,
            data2: "test2"
        }]);
    });
});
