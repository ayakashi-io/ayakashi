import {resolve as pathResolve, sep} from "path";
import {EmulatorOptions} from "../engine/createConnection";

const fullPath = pathResolve(__dirname);
let appRoot = fullPath.replace(sep + "lib" + sep + "runner", "");
if (process.platform === "win32") {
    appRoot = appRoot.replace(/\\/g, "/");
}

type StepConfig = {
    /**
     * Set it to `false` to disable the page console logs from getting printed.
     */
    pipeConsole?: boolean,
    /**
     * Set it to `false` to disable any page uncaught exceptions from getting printed.
     */
    pipeExceptions?: boolean,
    /**
     * Set it to `false` to disable automatic loading of local `actions`, `extractors`, `preloaders` and `props`
     */
    localAutoLoad?: boolean,
    /**
     * Emulation options for the scrapper to use.
     */
    emulatorOptions?: EmulatorOptions,
    /**
     * Used by the `--simple` run mode. For internal use only.
     */
    simple?: boolean
};

type StepLoadingOptions = {
    /**
     * An array of external extractor modules.
     */
    extractors?: string[],
    /**
     * An array of external action modules.
     */
    actions?: string[],
    /**
     * An array of external preloader modules.
     */
    preloaders?: string[] | {
        /**
         * The preloader's module name
         */
        module: string,
        /**
         * Set a custom name for the preloader
         */
        as?: string,
        /**
         * Set it to `true` to wait for the DOM to be ready before loading the preloader.
         */
        waitForDom?: boolean
    }[]
};

export type Config = {
    /**
     * Global configuration options.
     */
    config?: {
        /**
         * Setting it to `false` will disable headless mode.
         */
        headless?: boolean,
        /**
         * Configures the userAgent for all scrappers.
         * By default a random userAgent is used.
         */
        userAgent?: "random" | "desktop" | "mobile",
        /**
         * Sets a proxy url for all scrappers.
         */
        proxyUrl?: string,
        /**
         * Automatically open devTools for every tab.
         * `headless` must be `false` for it to have any effect.
         */
        openDevTools?: boolean,
        /**
         * Persists the session data of all pages instead of using a temporary session each time.
         * Learn more here https://ayakashi.io./docs/going_deeper/persisting-sessions.html
         */
        persistentSession?: boolean,
        /**
         * Sets the width of the browser window. Default is 1920.
         */
        windowWidth?: number,
        /**
         * Sets the height of the browser window. Default is 1080.
         */
        windowHeight?: number,
        /**
         * Use a custom chrome/chromium executable instead of the auto-downloaded one.
         * Learn more here: https://ayakashi.io/docs/going_deeper/using-a-different-chrome.html
         */
        chromePath?: string,
        /**
         * Ignore all certificate (ssl) errors.
         */
        ignoreCertificateErrors?: boolean,
        /**
         * Sets the port of the internal bridge server, Default is 9731.
         */
        bridgePort?: number,
        /**
         * Sets the port of the internal devTools protocol server, Default is 9730.
         */
        protocolPort?: number
    },
    /**
     * Execute the steps in a serial manner by passing each step's output to next one's input.
     */
    waterfall?: {
        /**
         * The type of the step.
         */
        type: "scrapper" | "script",
        /**
         * The name of the module.
         */
        module: string,
        /**
         * A custom parameters object to pass to the module.
         */
        params?: object,
        /**
         * Step configuration.
         */
        config?: StepConfig,
        /**
         * Specify external modules that should be loaded by the scrapper.
         */
        load?: StepLoadingOptions,
        /**
         * Execute the steps in parallel by passing the parent's input to all of the children.
         */
        parallel?: {
            /**
             * The type of the step.
             */
            type: "scrapper" | "script",
            /**
             * The name of the module.
             */
            module: string,
            /**
             * A custom parameters object to pass to the module.
             */
            params?: object,
            /**
             * Step configuration.
             */
            config?: StepConfig,
            /**
             * Specify external modules that should be loaded by the scrapper.
             */
            load?: StepLoadingOptions
        }[]
    }[],
    /**
     * Execute the steps in parallel by passing the parent's input to all of the children.
     */
    parallel?: {
        /**
         * The type of the step.
         */
        type: "scrapper" | "script",
        /**
         * The name of the module.
         */
        module: string,
        /**
         * A custom parameters object to pass to the module.
         */
        params?: object,
        /**
         * Step configuration.
         */
        config?: StepConfig,
        /**
         * Specify external modules that should be loaded by the scrapper.
         */
        load?: StepLoadingOptions,
        /**
         * Execute the steps in a serial manner by passing each step's output to next one's input.
         */
        waterfall?: {
            /**
             * The type of the step.
             */
            type: "scrapper" | "script",
            /**
             * The name of the module.
             */
            module: string,
            /**
             * A custom parameters object to pass to the module.
             */
            params?: object,
            /**
             * Step configuration.
             */
            config?: StepConfig,
            /**
             * Specify external modules that should be loaded by the scrapper.
             */
            load?: StepLoadingOptions
        }[]
    }[]
};

export type ProcGenerator = {name: string, from: string, to: string | string[], processor: Function | string};

export function firstPass(config: Config, previous?: string): (string | string[])[] {
    if (!config) {
        throw new Error("The config must be an object");
    }
    //tslint:disable no-any
    const firstPassArray: any[] = [];
    //tslint:enable no-any
    if (config.waterfall && Array.isArray(config.waterfall)) {
        config.waterfall.forEach(function(step, stepIndex: number) {
            if (previous) {
                firstPassArray.push(`${previous}_waterfall_${stepIndex}`);
            } else {
                firstPassArray.push(`waterfall_${stepIndex}`);
            }
            if (step.parallel && Array.isArray(step.parallel)) {
                if (previous) {
                    //@ts-ignore
                    firstPassArray.push(firstPass(step, `${previous}_waterfall_${stepIndex}`));
                } else {
                    //@ts-ignore
                    firstPassArray.push(firstPass(step, `waterfall_${stepIndex}`));
                }
            }
            //@ts-ignore
            if (step.waterfall && Array.isArray(step.waterfall)) {
                if (previous) {
                    //@ts-ignore
                    firstPassArray.push(firstPass(step, `${previous}_waterfall_${stepIndex}`));
                } else {
                    //@ts-ignore
                    firstPassArray.push(firstPass(step, `waterfall_${stepIndex}`));
                }
            }
        });
    }
    if (config.parallel && Array.isArray(config.parallel)) {
        config.parallel.forEach(function(step, stepIndex: number) {
            if (previous) {
                firstPassArray.push(`${previous}_parallel_${stepIndex}`);
            } else {
                firstPassArray.push(`parallel_${stepIndex}`);
            }
            if (step.waterfall && Array.isArray(step.waterfall)) {
                if (previous) {
                    //@ts-ignore
                    firstPassArray.push(firstPass(step, `${previous}_parallel_${stepIndex}`));
                } else {
                    //@ts-ignore
                    firstPassArray.push(firstPass(step, `parallel_${stepIndex}`));
                }
            }
            //@ts-ignore
            if (step.parallel && Array.isArray(step.parallel)) {
                if (previous) {
                    //@ts-ignore
                    firstPassArray.push(firstPass(step, `${previous}_parallel_${stepIndex}`));
                } else {
                    //@ts-ignore
                    firstPassArray.push(firstPass(step, `parallel_${stepIndex}`));
                }
            }
        });
    }

    return firstPassArray;
}

export function checkStepLevels(steps: (string | string[])[]) {
    if (steps.length === 0) {
        throw new Error("Can't have an empty level");
    }
    steps.forEach(function(step) {
        if (Array.isArray(step)) {
            if (step.length === 0) {
                throw new Error("Can't have an empty level");
            }
            checkStepLevels(step);
        } else {
            if (step.split("_").length > 4) {
                throw new Error("Can't have more than two nested levels");
            }
        }
    });
}

export function validateStepFormat(steps: (string | string[])[]) {
    if (steps[0] !== "waterfall_0" && steps[0] !== "parallel_0") {
        throw new Error("Top level element must be parallel or waterfall");
    }
    steps.forEach(function(step) {
        if (Array.isArray(step)) {
            step.forEach(function(stepN) {
                if (stepN.split("_")[stepN.split("_").length - 2] === "parallel" &&
                    stepN.split("_")[stepN.split("_").length - 4] === "parallel") {
                    throw new Error("Can't nest a parallel inside a parallel");
                }
                if (stepN.split("_")[stepN.split("_").length - 2] === "waterfall" &&
                    stepN.split("_")[stepN.split("_").length - 4] === "waterfall") {
                    throw new Error("Can't nest a waterfall inside a waterfall");
                }
            });
        }
    });
}

export function countSteps(steps: (string | string[])[]) {
    let count = 0;
    steps.forEach(function(step) {
        if (Array.isArray(step)) {
            count += countSteps(step);
        } else {
            count += 1;
        }
    });
    return count;
}

export function getObjectReference(
    config: Config,
    stepName: string
): {type?: string, module?: string, config?: object} {
    const formatedStepName = stepName.replace(/subwaterfall/g, "parallel");
    //@ts-ignore
    return formatedStepName.split("_").reduce(function(acc, key) {
        //@ts-ignore
        return acc[key];
    }, config) || {};
}

export function createProcGenerators(
    config: Config,
    steps: (string | string[])[],
    options: {
        bridgePort: number,
        protocolPort: number,
        projectFolder: string,
        operationId: string,
        startDate: string
    }
) {
    const procGenerators: ProcGenerator[] = [];
    const top = (<string>steps[0]).split("_")[0];
    if (top === "parallel") {
        steps
        .map(function(step, i) {
            if (typeof step === "string" && (typeof steps[i + 1] === "string" || !steps[i + 1])) {
                return [step];
            } else {
                return step;
            }
        })
        .filter(step => Array.isArray(step))
        .map(function(step) {
            return (<string[]>step).map(function(st: string) {
                const splitStep = st.split("_");
                return splitStep.join("_").replace(/parallel/g, "subwaterfall");
            });
        })
        .forEach(function(step, i) {
            if (step[0] !== `subwaterfall_${i}`) {
                step.unshift(`subwaterfall_${i}`);
            }
            step.unshift("init");
            step.push("end");
            _createProcGenerators(config, step, options, procGenerators);
        });
    } else {
        steps.unshift("init");
        steps.push("end");
        _createProcGenerators(config, steps, options, procGenerators);
    }

    return procGenerators;
}

function _createProcGenerators(
    config: Config,
    steps: (string | string[])[],
    options: {
        bridgePort: number,
        protocolPort: number,
        projectFolder: string,
        operationId: string,
        startDate: string
    },
    procGenerators: ProcGenerator[]
) {
    steps.forEach(function(step, index) {
        const previousStep = steps[index - 1];
        const previousPreviousStep = steps[index - 2];
        if (Array.isArray(step)) {
            step.forEach(function(st) {
                if (previousStep) {
                    if (Array.isArray(previousStep)) {
                        previousStep.forEach(function(pst) {
                            const isParallel = checkParallel(pst);
                            addPreStep(config, pst, st, isParallel, options, procGenerators);
                            if (isParallel && previousPreviousStep) {
                                addParallelPreStep(
                                    config,
                                    previousPreviousStep,
                                    st,
                                    options,
                                    procGenerators
                                );
                            }
                        });
                    } else {
                        const isParallel = checkParallel(previousStep);
                        addPreStep(config,
                            previousStep, st, isParallel, options, procGenerators);
                        if (isParallel && previousPreviousStep) {
                            addParallelPreStep(
                                config,
                                previousPreviousStep,
                                st,
                                options,
                                procGenerators
                            );
                        }
                    }
                }
                addStep(config, st, procGenerators);
            });
        } else {
            if (previousStep) {
                if (Array.isArray(previousStep)) {
                    previousStep.forEach(function(pst) {
                        const isParallel = checkParallel(pst);
                        addPreStep(config, pst, step, isParallel, options, procGenerators);
                        if (isParallel && previousPreviousStep) {
                            addParallelPreStep(
                                config,
                                previousPreviousStep,
                                step,
                                options,
                                procGenerators
                            );
                        }
                    });
                } else {
                    const isParallel = checkParallel(previousStep);
                    addPreStep(config, previousStep, step, isParallel, options, procGenerators);
                    if (isParallel && previousPreviousStep) {
                        addParallelPreStep(
                            config,
                            previousPreviousStep,
                            step,
                            options,
                            procGenerators
                        );
                    }
                }
            }
            addStep(config, step, procGenerators);
        }
    });
}

function checkParallel(step: string): boolean {
    let isParallel = false;
    if (step.split("_")[step.split("_").length - 2] === "parallel") {
        isParallel = true;
    }
    return isParallel;
}

function addStep(
    config: Config,
    step: string,
    procGenerators: ProcGenerator[]
) {
    if (step === "init") return;
    if (!procGenerators.find(pr => pr.from === `pre_${step}` && pr.to === step)) {
        const objectRef = getObjectReference(config, step);
        if (objectRef.type === "scrapper") {
            if (!objectRef.module) return;
            procGenerators.push({
                name: `proc_from_pre_${step}_to_${step}`,
                from: `pre_${step}`,
                to: step,
                processor: pathResolve(appRoot, "lib/runner/scrapperWrapper.js")
            });
        } else {
            objectRef.type = "script";
            if (!objectRef.module) return;
            procGenerators.push({
                name: `proc_from_pre_${step}_to_${step}`,
                from: `pre_${step}`,
                to: step,
                processor: pathResolve(appRoot, "lib/runner/scriptWrapper.js")
            });
        }
    }
}

function addPreStep(
    config: Config,
    previousStep: string,
    step: string,
    isParallel: boolean,
    options: {
        bridgePort: number,
        protocolPort: number,
        projectFolder: string,
        operationId: string,
        startDate: string
    },
    procGenerators: ProcGenerator[]
) {
    if (step === "init") return;
    if (!procGenerators.find(pr => pr.from === previousStep && pr.to === `pre_${step}`) &&
        !isParallel) {
            procGenerators.push({
                name: `proc_from_${previousStep}_to_pre_${step}`,
                from: previousStep,
                to: `pre_${step}`,
                //tslint:disable max-line-length
                processor: new Function("log", `
                    const obj = ${JSON.stringify(getObjectReference(config, step))};
                    if (obj.type === "scrapper") {
                        return Promise.resolve({
                            input: log.body,
                            config: (obj && obj.config) || {},
                            params: (obj && obj.params) || {},
                            load: (obj && obj.load) || {},
                            module: (obj && obj.module) || "",
                            connectionConfig: ${JSON.stringify({bridgePort: options.bridgePort, protocolPort: options.protocolPort})},
                            saveTopic: "${step}",
                            projectFolder: "${options.projectFolder}",
                            operationId: "${options.operationId}",
                            startDate: "${options.startDate}",
                            procName: "proc_from_pre_${step}_to_${step}",
                            appRoot: "${appRoot}"
                        });
                    } else {
                        return Promise.resolve({
                            input: log.body,
                            params: (obj && obj.params) || {},
                            module: (obj && obj.module) || "",
                            saveTopic: "${step}",
                            projectFolder: "${options.projectFolder}",
                            operationId: "${options.operationId}",
                            startDate: "${options.startDate}",
                            procName: "proc_from_pre_${step}_to_${step}",
                            appRoot: "${appRoot}"
                        });
                    }
                `)
                //tslint:enable max-line-length
            });
    }
}

function addParallelPreStep(
    config: Config,
    previousPreviousStep: string | string[],
    step: string,
    options: {
        bridgePort: number,
        protocolPort: number,
        projectFolder: string,
        operationId: string,
        startDate: string
    },
    procGenerators: ProcGenerator[]
) {
    if (step === "init") return;
    if (Array.isArray(previousPreviousStep)) {
        previousPreviousStep.forEach(function(ppst) {
            if (!procGenerators.find(pr => pr.from === ppst && pr.to === `pre_${step}`))
            procGenerators.push({
                name: `proc_from_${ppst}_to_pre_${step}`,
                from: ppst,
                to: `pre_${step}`,
                //tslint:disable max-line-length
                processor: new Function("log", `
                    const obj = ${JSON.stringify(getObjectReference(config, step))};
                    if (obj.type === "scrapper") {
                        return Promise.resolve({
                            input: log.body,
                            config: (obj && obj.config) || {},
                            params: (obj && obj.params) || {},
                            load: (obj && obj.load) || {},
                            module: (obj && obj.module) || "",
                            connectionConfig: ${JSON.stringify({bridgePort: options.bridgePort, protocolPort: options.protocolPort})},
                            saveTopic: "${step}",
                            projectFolder: "${options.projectFolder}",
                            operationId: "${options.operationId}",
                            startDate: "${options.startDate}",
                            procName: "proc_from_pre_${step}_to_${step}",
                            appRoot: "${appRoot}"
                        });
                    } else {
                        return Promise.resolve({
                            input: log.body,
                            params: (obj && obj.params) || {},
                            module: (obj && obj.module) || "",
                            saveTopic: "${step}",
                            projectFolder: "${options.projectFolder}",
                            operationId: "${options.operationId}",
                            startDate: "${options.startDate}",
                            procName: "proc_from_pre_${step}_to_${step}",
                            appRoot: "${appRoot}"
                        });
                    }
                `)
                //tslint:enable max-line-length
            });
        });
    } else {
        if (!procGenerators.find(pr => pr.from === previousPreviousStep && pr.to === `pre_${step}`))
        procGenerators.push({
            name: `proc_from_${previousPreviousStep}_to_pre_${step}`,
            from: previousPreviousStep,
            to: `pre_${step}`,
            //tslint:disable max-line-length
            processor: new Function("log", `
                const obj = ${JSON.stringify(getObjectReference(config, step))};
                if (obj.type === "scrapper") {
                    return Promise.resolve({
                        input: log.body,
                        config: (obj && obj.config) || {},
                        params: (obj && obj.params) || {},
                        load: (obj && obj.load) || {},
                        module: (obj && obj.module) || "",
                        connectionConfig: ${JSON.stringify({bridgePort: options.bridgePort, protocolPort: options.protocolPort})},
                        saveTopic: "${step}",
                        projectFolder: "${options.projectFolder}",
                        operationId: "${options.operationId}",
                        startDate: "${options.startDate}",
                        procName: "proc_from_pre_${step}_to_${step}",
                        appRoot: "${appRoot}"
                    });
                } else {
                    return Promise.resolve({
                        input: log.body,
                        params: (obj && obj.params) || {},
                        module: (obj && obj.module) || "",
                        saveTopic: "${step}",
                        projectFolder: "${options.projectFolder}",
                        operationId: "${options.operationId}",
                        startDate: "${options.startDate}",
                        procName: "proc_from_pre_${step}_to_${step}",
                        appRoot: "${appRoot}"
                    });
                }
            `)
            //tslint:enable max-line-length
        });
    }
}
