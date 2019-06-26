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
            storeProjectFolder: "",
            operationId: "",
            startDate: ""
        }).procGenerators.map((p) => {
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
            storeProjectFolder: "",
            operationId: "",
            startDate: ""
        }).procGenerators.map((p) => {
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
            storeProjectFolder: "",
            operationId: "",
            startDate: ""
        }).procGenerators.map((p) => {
            delete p.processor;
            delete p.name;
            delete p.config;
            return p;
        });
        expect(procGenerators).toIncludeAllMembers([{
            from: "init_0",
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
            storeProjectFolder: "",
            operationId: "",
            startDate: ""
        }).procGenerators.map((p) => {
            delete p.processor;
            delete p.name;
            delete p.config;
            return p;
        });
        expect(procGenerators).toIncludeAllMembers([{
            from: "init_0",
            to: "pre_subwaterfall_0"
        }, {
            from: "pre_subwaterfall_0",
            to: "subwaterfall_0"
        }, {
            from: "subwaterfall_0",
            to: "pre_end"
        }, {
            from: "init_1",
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
            storeProjectFolder: "",
            operationId: "",
            startDate: ""
        }).procGenerators.map((p) => {
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
            storeProjectFolder: "",
            operationId: "",
            startDate: ""
        }).procGenerators.map((p) => {
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
            storeProjectFolder: "",
            operationId: "",
            startDate: ""
        }).procGenerators.map((p) => {
            delete p.processor;
            delete p.name;
            delete p.config;
            return p;
        });
        expect(procGenerators).toIncludeAllMembers([{
            from: "init_0",
            to: "pre_subwaterfall_0"
        }, {
            from: "pre_subwaterfall_0",
            to: "subwaterfall_0"
        }, {
            from: "init_1",
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
            storeProjectFolder: "",
            operationId: "",
            startDate: ""
        }).procGenerators.map((p) => {
            delete p.processor;
            delete p.name;
            delete p.config;
            return p;
        });
        expect(procGenerators).toIncludeAllMembers([{
            from: "init_0",
            to: "pre_subwaterfall_0"
        }, {
            from: "pre_subwaterfall_0",
            to: "subwaterfall_0"
        }, {
            from: "init_1",
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
            storeProjectFolder: "",
            operationId: "",
            startDate: ""
        }).procGenerators.map((p) => {
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

    test("selfTopic is correct, parallel", async function() {
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
        const procFunctions = createProcGenerators(config, steps, {
            protocolPort: 1,
            bridgePort: 1,
            projectFolder: "",
            storeProjectFolder: "",
            operationId: "",
            startDate: ""
        }).procGenerators.map((p) => {
            return p.processor;
        }).filter(p => typeof p === "function");
        const selfTopics = (await Promise.all(procFunctions.map(async function(func) {
            //@ts-ignore
            const conf = await func({});
            if (conf.procName === "proc_from_pre_end_to_end") return null;
            //@ts-ignore
            return conf.selfTopic;
        }))).filter(t => t);
        expect(selfTopics.toString()).toBe(["init_0", "init_1"].toString());
    });

    test("selfTopic is correct, parallel with nested waterfall", async function() {
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
        const procFunctions = createProcGenerators(config, steps, {
            protocolPort: 1,
            bridgePort: 1,
            projectFolder: "",
            storeProjectFolder: "",
            operationId: "",
            startDate: ""
        }).procGenerators.map((p) => {
            return p.processor;
        }).filter(p => typeof p === "function");
        const selfTopics = (await Promise.all(procFunctions.map(async function(func) {
            //@ts-ignore
            const conf = await func({});
            if (conf.procName === "proc_from_pre_end_to_end") return null;
            //@ts-ignore
            return conf.selfTopic;
        }))).filter(t => t);
        expect(selfTopics.toString()).toBe([
            "init_0",
            "subwaterfall_0",
            "subwaterfall_0_waterfall_0",
            "init_1",
            "subwaterfall_1",
            "subwaterfall_1_waterfall_0"
        ].toString());
    });

    test("selfTopic is correct, waterfall", async function() {
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
        const procFunctions = createProcGenerators(config, steps, {
            protocolPort: 1,
            bridgePort: 1,
            projectFolder: "",
            storeProjectFolder: "",
            operationId: "",
            startDate: ""
        }).procGenerators.map((p) => {
            return p.processor;
        }).filter(p => typeof p === "function");
        const selfTopics = (await Promise.all(procFunctions.map(async function(func) {
            //@ts-ignore
            const conf = await func({});
            if (conf.procName === "proc_from_pre_end_to_end") return null;
            //@ts-ignore
            return conf.selfTopic;
        }))).filter(t => t);
        expect(selfTopics.toString()).toBe(["init", "waterfall_0"].toString());
    });

    test("selfTopic is correct, waterfall with nested parallel", async function() {
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
        const procFunctions = createProcGenerators(config, steps, {
            protocolPort: 1,
            bridgePort: 1,
            projectFolder: "",
            storeProjectFolder: "",
            operationId: "",
            startDate: ""
        }).procGenerators.map((p) => {
            return p.processor;
        }).filter(p => typeof p === "function");
        const selfTopics = (await Promise.all(procFunctions.map(async function(func) {
            //@ts-ignore
            const conf = await func({});
            if (conf.procName === "proc_from_pre_end_to_end") return null;
            //@ts-ignore
            return conf.selfTopic;
        }))).filter(t => t);
        expect(selfTopics.toString()).toBe([
            "init",
            "waterfall_0",
            "waterfall_0",
            "waterfall_0",
            "waterfall_1",
            "waterfall_1"
        ].toString());
    });
});
