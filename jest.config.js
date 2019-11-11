module.exports = {
    "transform": {
        "^.+\\.tsx?$": "ts-jest"
    },
    "setupFilesAfterEnv": ["jest-extended"],
    "testRegex": "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
    "moduleFileExtensions": [
        "ts",
        "tsx",
        "js",
        "jsx",
        "json",
        "node"
    ],
    "testPathIgnorePatterns": [
        "/node_modules/",
        "/__tests__/utils/",
        "(.)*test_files(.)*"
    ],
    "testEnvironment": "node",
    "testURL": "http://localhost",
    "globals": {
        "ts-jest": {
            // "diagnostics": {
            //     "warnOnly": true
            // }
        }
    }
};
