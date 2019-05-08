//tslint:disable
import "jest-extended";
//tslint:enable
import {firstPass, Config, createProcGenerators} from "../../../src/runner/parseConfig";

describe("createProcGenerators", function() {

    test("really simple waterfall", function() {
        const config: Config = {
            waterfall: [{
                type: "scrapper",
                module: "test"
            }]
        };
        const steps = firstPass(config);
        const procGenerators = createProcGenerators(config, steps, {
            protocolPort: 1,
            bridgePort: 1,
            projectFolder: "",
            operationId: "",
            startDate: ""
        }).map((p) => {
            delete p.processor;
            delete p.name;
            delete p.config;
            return p;
        });
        expect(procGenerators).toIncludeAllMembers([{
            from: "init",
            to: "pre_waterfall_0"
        }, {
            from: "pre_waterfall_0",
            to: "waterfall_0"
        }, {
            from: "waterfall_0",
            to: "pre_end"
        }]);
    });

    test("simple waterfall", function() {
        const config: Config = {
            waterfall: [{
                type: "scrapper",
                module: "test"
            }, {
                type: "scrapper",
                module: "test"
            }]
        };
        const steps = firstPass(config);
        const procGenerators = createProcGenerators(config, steps, {
            protocolPort: 1,
            bridgePort: 1,
            projectFolder: "",
            operationId: "",
            startDate: ""
        }).map((p) => {
            delete p.processor;
            delete p.name;
            delete p.config;
            return p;
        });
        expect(procGenerators).toIncludeAllMembers([{
            from: "init",
            to: "pre_waterfall_0"
        }, {
            from: "pre_waterfall_0",
            to: "waterfall_0"
        }, {
            from: "waterfall_0",
            to: "pre_waterfall_1"
        }, {
            from: "pre_waterfall_1",
            to: "waterfall_1"
        }, {
            from: "waterfall_1",
            to: "pre_end"
        }]);
    });

    test("really simple parallel", function() {
        const config: Config = {
            parallel: [{
                type: "scrapper",
                module: "test"
            }]
        };
        const steps = firstPass(config);
        const procGenerators = createProcGenerators(config, steps, {
            protocolPort: 1,
            bridgePort: 1,
            projectFolder: "",
            operationId: "",
            startDate: ""
        }).map((p) => {
            delete p.processor;
            delete p.name;
            delete p.config;
            return p;
        });
        expect(procGenerators).toIncludeAllMembers([{
            from: "init",
            to: "pre_subwaterfall_0"
        }, {
            from: "pre_subwaterfall_0",
            to: "subwaterfall_0"
        }, {
            from: "subwaterfall_0",
            to: "pre_end"
        }]);
    });

    test("simple parallel", function() {
        const config: Config = {
            parallel: [{
                type: "scrapper",
                module: "test"
            }, {
                type: "scrapper",
                module: "test"
            }]
        };
        const steps = firstPass(config);
        const procGenerators = createProcGenerators(config, steps, {
            protocolPort: 1,
            bridgePort: 1,
            projectFolder: "",
            operationId: "",
            startDate: ""
        }).map((p) => {
            delete p.processor;
            delete p.name;
            delete p.config;
            return p;
        });
        expect(procGenerators).toIncludeAllMembers([{
            from: "init",
            to: "pre_subwaterfall_0"
        }, {
            from: "pre_subwaterfall_0",
            to: "subwaterfall_0"
        }, {
            from: "subwaterfall_0",
            to: "pre_end"
        }, {
            from: "init",
            to: "pre_subwaterfall_1"
        }, {
            from: "pre_subwaterfall_1",
            to: "subwaterfall_1"
        }, {
            from: "subwaterfall_1",
            to: "pre_end"
        }]);
    });

    test("waterfall with nested parallel", function() {
        const config: Config = {
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
            }, {
                type: "scrapper",
                module: "test"
            }]
        };
        const steps = firstPass(config);
        const procGenerators = createProcGenerators(config, steps, {
            protocolPort: 1,
            bridgePort: 1,
            projectFolder: "",
            operationId: "",
            startDate: ""
        }).map((p) => {
            delete p.processor;
            delete p.name;
            delete p.config;
            return p;
        });
        expect(procGenerators).toIncludeAllMembers([{
            from: "init",
            to: "pre_waterfall_0"
        }, {
            from: "pre_waterfall_0",
            to: "waterfall_0"
        }, {
            from: "waterfall_0",
            to: "pre_waterfall_0_parallel_0"
        }, {
            from: "pre_waterfall_0_parallel_0",
            to: "waterfall_0_parallel_0"
        }, {
            from: "waterfall_0",
            to: "pre_waterfall_0_parallel_1"
        }, {
            from: "pre_waterfall_0_parallel_1",
            to: "waterfall_0_parallel_1"
        }, {
            from: "waterfall_0",
            to: "pre_waterfall_1"
        }, {
            from: "pre_waterfall_1",
            to: "waterfall_1"
        }, {
            from: "waterfall_1",
            to: "pre_end"
        }]);
    });

    test("waterfall with nested parallel 2", function() {
        const config: Config = {
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
        const steps = firstPass(config);
        const procGenerators = createProcGenerators(config, steps, {
            protocolPort: 1,
            bridgePort: 1,
            projectFolder: "",
            operationId: "",
            startDate: ""
        }).map((p) => {
            delete p.processor;
            delete p.name;
            delete p.config;
            return p;
        });
        expect(procGenerators).toIncludeAllMembers([{
            from: "init",
            to: "pre_waterfall_0"
        }, {
            from: "pre_waterfall_0",
            to: "waterfall_0"
        }, {
            from: "waterfall_0",
            to: "pre_waterfall_0_parallel_0"
        }, {
            from: "pre_waterfall_0_parallel_0",
            to: "waterfall_0_parallel_0"
        }, {
            from: "waterfall_0",
            to: "pre_waterfall_0_parallel_1"
        }, {
            from: "pre_waterfall_0_parallel_1",
            to: "waterfall_0_parallel_1"
        }, {
            from: "waterfall_0",
            to: "pre_waterfall_1"
        }, {
            from: "pre_waterfall_1",
            to: "waterfall_1"
        }, {
            from: "waterfall_1",
            to: "pre_end"
        }, {
            from: "waterfall_1",
            to: "pre_waterfall_1_parallel_0"
        }, {
            from: "pre_waterfall_1_parallel_0",
            to: "waterfall_1_parallel_0"
        }, {
            from: "waterfall_1",
            to: "pre_waterfall_1_parallel_1"
        }, {
            from: "pre_waterfall_1_parallel_1",
            to: "waterfall_1_parallel_1"
        }
        ]);
    });

    test("parallel with nested waterfall", function() {
        const config: Config = {
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
            }, {
                type: "scrapper",
                module: "test"
            }]
        };
        const steps = firstPass(config);
        const procGenerators = createProcGenerators(config, steps, {
            protocolPort: 1,
            bridgePort: 1,
            projectFolder: "",
            operationId: "",
            startDate: ""
        }).map((p) => {
            delete p.processor;
            delete p.name;
            delete p.config;
            return p;
        });
        expect(procGenerators).toIncludeAllMembers([{
            from: "init",
            to: "pre_subwaterfall_0"
        }, {
            from: "pre_subwaterfall_0",
            to: "subwaterfall_0"
        }, {
            from: "init",
            to: "pre_subwaterfall_1"
        }, {
            from: "pre_subwaterfall_1",
            to: "subwaterfall_1"
        }, {
            from: "subwaterfall_1",
            to: "pre_end"
        }, {
            from: "subwaterfall_0",
            to: "pre_subwaterfall_0_waterfall_0"
        }, {
            from: "pre_subwaterfall_0_waterfall_0",
            to: "subwaterfall_0_waterfall_0"
        }, {
            from: "subwaterfall_0_waterfall_0",
            to: "pre_subwaterfall_0_waterfall_1"
        }, {
            from: "pre_subwaterfall_0_waterfall_1",
            to: "subwaterfall_0_waterfall_1"
        }, {
            from: "subwaterfall_0_waterfall_1",
            to: "pre_end"
        }]);
    });

    test("parallel with nested waterfall 2", function() {
        const config: Config = {
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
        const steps = firstPass(config);
        const procGenerators = createProcGenerators(config, steps, {
            protocolPort: 1,
            bridgePort: 1,
            projectFolder: "",
            operationId: "",
            startDate: ""
        }).map((p) => {
            delete p.processor;
            delete p.name;
            delete p.config;
            return p;
        });
        expect(procGenerators).toIncludeAllMembers([{
            from: "init",
            to: "pre_subwaterfall_0"
        }, {
            from: "pre_subwaterfall_0",
            to: "subwaterfall_0"
        }, {
            from: "init",
            to: "pre_subwaterfall_1"
        }, {
            from: "pre_subwaterfall_1",
            to: "subwaterfall_1"
        }, {
            from: "subwaterfall_0",
            to: "pre_subwaterfall_0_waterfall_0"
        }, {
            from: "pre_subwaterfall_0_waterfall_0",
            to: "subwaterfall_0_waterfall_0"
        }, {
            from: "subwaterfall_0_waterfall_0",
            to: "pre_subwaterfall_0_waterfall_1"
        }, {
            from: "pre_subwaterfall_0_waterfall_1",
            to: "subwaterfall_0_waterfall_1"
        }, {
            from: "subwaterfall_0_waterfall_1",
            to: "pre_end"
        }, {
            from: "subwaterfall_1",
            to: "pre_subwaterfall_1_waterfall_0"
        }, {
            from: "pre_subwaterfall_1_waterfall_0",
            to: "subwaterfall_1_waterfall_0"
        }, {
            from: "subwaterfall_1_waterfall_0",
            to: "pre_subwaterfall_1_waterfall_1"
        }, {
            from: "pre_subwaterfall_1_waterfall_1",
            to: "subwaterfall_1_waterfall_1"
        }, {
            from: "subwaterfall_1_waterfall_1",
            to: "pre_end"
        }]);
    });

    test("retries are passed on correctly", function() {
        const config: Config = {
            waterfall: [{
                type: "scrapper",
                module: "test",
                config: {
                    retries: 10
                }
            }]
        };
        const steps = firstPass(config);
        const procGenerators = createProcGenerators(config, steps, {
            protocolPort: 1,
            bridgePort: 1,
            projectFolder: "",
            operationId: "",
            startDate: ""
        }).map((p) => {
            delete p.processor;
            delete p.name;
            return p;
        });
        expect(procGenerators).toIncludeAllMembers([{
            from: "init",
            to: "pre_waterfall_0",
            config: {}
        }, {
            from: "pre_waterfall_0",
            to: "waterfall_0",
            config: {
                retries: 10
            }
        }, {
            from: "waterfall_0",
            to: "pre_end",
            config: {}
        }]);
    });
});
