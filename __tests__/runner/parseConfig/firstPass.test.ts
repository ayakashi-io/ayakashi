//tslint:disable
import "jest-extended";
//tslint:enable
import {firstPass, Config} from "../../../src/runner/parseConfig";

describe("firstPass", function() {
    test("it parses configs with a single step correctly, waterfall", function() {
        const config: Config = {
            waterfall: [{
                type: "scrapper",
                module: "test"
            }]
        };
        expect(firstPass(config)).toBeArrayOfSize(1);
        expect(firstPass(config)[0]).toBe("waterfall_0");
    });

    test("it parses configs with a single step correctly, parallel", function() {
        const config: Config = {
            parallel: [{
                type: "scrapper",
                module: "test"
            }]
        };
        expect(firstPass(config)).toBeArrayOfSize(1);
        expect(firstPass(config)[0]).toBe("parallel_0");
    });

    test("it parses configs with multiple steps correctly, waterfall", function() {
        const config: Config = {
            waterfall: [{
                type: "scrapper",
                module: "test"
            }, {
                type: "scrapper",
                module: "test"
            }]
        };
        expect(firstPass(config)).toBeArrayOfSize(2);
        expect(firstPass(config)[0]).toBe("waterfall_0");
        expect(firstPass(config)[1]).toBe("waterfall_1");
    });

    test("it parses configs with multiple steps correctly, parallel", function() {
        const config: Config = {
            parallel: [{
                type: "scrapper",
                module: "test"
            }, {
                type: "scrapper",
                module: "test"
            }]
        };
        expect(firstPass(config)).toBeArrayOfSize(2);
        expect(firstPass(config)[0]).toBe("parallel_0");
        expect(firstPass(config)[1]).toBe("parallel_1");
    });

    test("it parses configs with nested steps correctly, waterfall-parallel", function() {
        const config: Config = {
            waterfall: [{
                type: "scrapper",
                module: "test"
            }, {
                type: "scrapper",
                module: "test",
                parallel: [{
                    type: "scrapper",
                    module: "test"
                }, {
                    type: "scrapper",
                    module: "test"
                }]
            }]
        };
        expect(firstPass(config)).toBeArrayOfSize(3);
        expect(firstPass(config)[0]).toBe("waterfall_0");
        expect(firstPass(config)[1]).toBe("waterfall_1");
        expect(firstPass(config)[2]).toBeArrayOfSize(2);
        expect(firstPass(config)[2][0]).toBe("waterfall_1_parallel_0");
        expect(firstPass(config)[2][1]).toBe("waterfall_1_parallel_1");
    });

    test("it parses configs with nested steps correctly, parallel-waterfall", function() {
        const config: Config = {
            parallel: [{
                type: "scrapper",
                module: "test"
            }, {
                type: "scrapper",
                module: "test",
                waterfall: [{
                    type: "scrapper",
                    module: "test"
                }, {
                    type: "scrapper",
                    module: "test"
                }]
            }]
        };
        expect(firstPass(config)).toBeArrayOfSize(3);
        expect(firstPass(config)[0]).toBe("parallel_0");
        expect(firstPass(config)[1]).toBe("parallel_1");
        expect(firstPass(config)[2]).toBeArrayOfSize(2);
        expect(firstPass(config)[2][0]).toBe("parallel_1_waterfall_0");
        expect(firstPass(config)[2][1]).toBe("parallel_1_waterfall_1");
    });

    test("it returns an empty array with an empty config", function() {
        const config: Config = {};
        expect(firstPass(config)).toBeArrayOfSize(0);
    });

    test("it returns an empty array if the config is not an object", function() {
        //@ts-ignore
        const config: Config = "string";
        expect(firstPass(config)).toBeArrayOfSize(0);
    });

    test("it throws an error if the config is undefined", function() {
        //@ts-ignore
        //tslint:disable
        expect(() => firstPass()).toThrowError("The config must be an object");
        //tslint:enable
    });

    test("it throws an error if the config is null", function() {
        //@ts-ignore
        //tslint:disable
        expect(() => firstPass(null)).toThrowError("The config must be an object");
        //tslint:enable
    });

    test("it returns an empty array with an empty waterfall option", function() {
        const config: Config = {
            waterfall: []
        };
        expect(firstPass(config)).toBeArrayOfSize(0);
    });

    test("it returns an empty array with an empty parallel option", function() {
        const config: Config = {
            parallel: []
        };
        expect(firstPass(config)).toBeArrayOfSize(0);
    });

    test("it parses configs with multi-nested levels, parallel", function() {
        const config: Config = {
            parallel: [{
                type: "scrapper",
                module: "test"
            }, {
                type: "scrapper",
                module: "test",
                //@ts-ignore
                parallel: [{
                    type: "scrapper",
                    module: "test"
                }, {
                    type: "scrapper",
                    module: "test",
                    //@ts-ignore
                    parallel: [{
                        type: "scrapper",
                        module: "test",
                        parallel: [{
                            type: "scrapper",
                            module: "test",
                            waterfall: [{
                                type: "scrapper",
                                module: "test"
                            }, {
                                type: "scrapper",
                                module: "test"
                            }]
                        }]
                    }]
                }]
            }]
        };
        expect(firstPass(config)).toBeArrayOfSize(3);
        expect(firstPass(config)[0]).toBe("parallel_0");
        expect(firstPass(config)[1]).toBe("parallel_1");
        expect(firstPass(config)[2]).toBeArrayOfSize(3);
        expect(firstPass(config)[2][0]).toBe("parallel_1_parallel_0");
        expect(firstPass(config)[2][1]).toBe("parallel_1_parallel_1");
        expect(firstPass(config)[2][2]).toBeArrayOfSize(2);
        expect(firstPass(config)[2][2][0]).toBe("parallel_1_parallel_1_parallel_0");
    });

    test("it parses configs with multi-nested levels, waterfall", function() {
        const config: Config = {
            waterfall: [{
                type: "scrapper",
                module: "test"
            }, {
                type: "scrapper",
                module: "test",
                //@ts-ignore
                waterfall: [{
                    type: "scrapper",
                    module: "test"
                }, {
                    type: "scrapper",
                    module: "test",
                    //@ts-ignore
                    waterfall: [{
                        type: "scrapper",
                        module: "test",
                        waterfall: [{
                            type: "scrapper",
                            module: "test",
                            parallel: [{
                                type: "scrapper",
                                module: "test"
                            }, {
                                type: "scrapper",
                                module: "test"
                            }]
                        }]
                    }]
                }]
            }]
        };
        expect(firstPass(config)).toBeArrayOfSize(3);
        expect(firstPass(config)[0]).toBe("waterfall_0");
        expect(firstPass(config)[1]).toBe("waterfall_1");
        expect(firstPass(config)[2]).toBeArrayOfSize(3);
        expect(firstPass(config)[2][0]).toBe("waterfall_1_waterfall_0");
        expect(firstPass(config)[2][1]).toBe("waterfall_1_waterfall_1");
        expect(firstPass(config)[2][2]).toBeArrayOfSize(2);
        expect(firstPass(config)[2][2][0]).toBe("waterfall_1_waterfall_1_waterfall_0");
    });
});
