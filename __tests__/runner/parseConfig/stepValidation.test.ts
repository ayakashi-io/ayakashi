//tslint:disable
import "jest-extended";
//tslint:enable
import {firstPass, Config, checkStepLevels, validateStepFormat} from "../../../src/runner/parseConfig";

describe("validation", function() {
    test("it doesn't allow configs nested more than 2 levels deep", function() {
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
                        module: "test"
                    }]
                }]
            }]
        };
        const steps = firstPass(config);
        expect(() => checkStepLevels(steps)).toThrowError("Can't have more than two nested levels");
    });

    test("it doesn't allow configs with an empty level", function() {
        const config: Config = {
            parallel: []
        };
        const steps = firstPass(config);
        expect(() => checkStepLevels(steps)).toThrowError("Can't have an empty level");
    });

    test("it doesn't allow configs with nested empty levels", function() {
        const config: Config = {
            parallel: [{
                //@ts-ignore
                parallel: []
            }]
        };
        const steps = firstPass(config);
        expect(() => checkStepLevels(steps)).toThrowError("Can't have an empty level");
    });

    test("it doesn't allow configs with a parallel inside a parallel, nested", function() {
        const config: Config = {
            parallel: [{
                //@ts-ignore
                parallel: [{
                    type: "scrapper",
                    module: "test"
                }]
            }]
        };
        const steps = firstPass(config);
        expect(() => validateStepFormat(steps)).toThrowError("Can't nest a parallel inside a parallel");
    });

    test("it doesn't allow configs with a parallel inside a parallel, nested", function() {
        const config: Config = {
            parallel: [{
                //@ts-ignore
                parallel: [{
                    type: "scrapper",
                    module: "test",
                    parallel: [{
                        type: "scrapper",
                        module: "test"
                    }]
                }]
            }]
        };
        const steps = firstPass(config);
        expect(() => validateStepFormat(steps)).toThrowError("Can't nest a parallel inside a parallel");
    });

    test("it doesn't allow configs with a waterfall inside a waterfall, nested", function() {
        const config: Config = {
            waterfall: [{
                //@ts-ignore
                waterfall: [{
                    type: "scrapper",
                    module: "test"
                }]
            }]
        };
        const steps = firstPass(config);
        expect(() => validateStepFormat(steps)).toThrowError("Can't nest a waterfall inside a waterfall");
    });

    test("it doesn't allow configs with a waterfall inside a waterfall, nested", function() {
        const config: Config = {
            waterfall: [{
                //@ts-ignore
                waterfall: [{
                    type: "scrapper",
                    module: "test",
                    waterfall: [{
                        type: "scrapper",
                        module: "test"
                    }]
                }]
            }]
        };
        const steps = firstPass(config);
        expect(() => validateStepFormat(steps)).toThrowError("Can't nest a waterfall inside a waterfall");
    });

    test("it doesn't allow configs with no waterfall or parallel", function() {
        const config: Config = {
            //@ts-ignore
            somethingElse: [{
                //@ts-ignore
                waterfall: [{
                    type: "scrapper",
                    module: "test",
                    waterfall: [{
                        type: "scrapper",
                        module: "test"
                    }]
                }]
            }]
        };
        const steps = firstPass(config);
        expect(() => validateStepFormat(steps)).toThrowError("Top level element must be parallel or waterfall");
    });
});
