//tslint:disable
import "jest-extended";
import {JSDOM} from "jsdom";
//tslint:enable

import {domQuery} from "../../src/domQL/domQL";

const dom = new JSDOM(`
    <style>
        .listValues {
            color: red;
        }
    </style>
    <div>
        <ul id="myList">
            <li class="listValues" data-my="test">value 1</li>
            <li class="listValues">value 2</li>
            <li class="listValues">value 3</li>
        </ul>
    </div>
`);

describe("test invalid input", function() {
    it("should raise an error for an invalid operator", function() {
        expect(() => domQuery({
            where: {
                id: {
                    invalidOperator: "myList"
                }
            }
        }, {
            env: dom.window
        })).toThrowError("Invalid operator: invalidOperator");
    });

    it("should raise an error if a valid env does not exist or passed", function() {
        expect(() => domQuery({
            where: {
                id: {
                    eq: "myList"
                }
            }
        })).toThrowError("No suitable env found");
    });

    it("should raise an error if query format is invalid", function() {
        //@ts-ignore
        expect(() => domQuery(undefined, {
            env: dom.window
        })).toThrowError("Query format is invalid");

        expect(() => domQuery({
            //@ts-ignore
            where: "hello"
        }, {
            env: dom.window
        })).toThrowError("Query format is invalid");

        expect(() => domQuery({
            //@ts-ignore
            where: {}
        }, {
            env: dom.window
        })).toThrowError("Query format is invalid");
    });

    it("should raise an error if the expected value is null", function() {
        expect(() => domQuery({
            //@ts-ignore
            where: {
                id: {
                    eq: null
                }
            }
        }, {
            env: dom.window
        })).toThrowError("Invalid expected value: null");
    });

    it("should raise an error if the expected value is undefined", function() {
        expect(() => domQuery({
            //@ts-ignore
            where: {
                id: {
                    eq: undefined
                }
            }
        }, {
            env: dom.window
        })).toThrowError("Invalid expected value: undefined");
    });

    it("should raise an error if the expected value is false", function() {
        expect(() => domQuery({
            //@ts-ignore
            where: {
                //@ts-ignore
                id: {
                    eq: false
                }
            }
        }, {
            env: dom.window
        })).toThrowError("Invalid expected value: false");
    });

    it("should raise an error if the expected value is ''", function() {
        expect(() => domQuery({
            where: {
                //@ts-ignore
                id: {
                    eq: ""
                }
            }
        }, {
            env: dom.window
        })).toThrowError("Invalid expected value: empty_string");
    });

    it("should raise an error if the expected value is an array with invalid members", function() {
        expect(() => domQuery({
            //@ts-ignore
            where: {
                id: {
                    $nin: [null]
                }
            }
        }, {
            env: dom.window
        })).toThrowError("Invalid expected value: [null]");
    });

    it("should raise an error if the expected value is an empty array", function() {
        expect(() => domQuery({
            where: {
                //@ts-ignore
                id: {
                    in: []
                }
            }
        }, {
            env: dom.window
        })).toThrowError("Invalid expected value: []");
    });

    it("should raise an error if the expected value is an object", function() {
        expect(() => domQuery({
            where: {
                //@ts-ignore
                id: {
                    in: {anObject: "hi"}
                }
            }
        }, {
            env: dom.window
        })).toThrowError(`Invalid expected value: ${JSON.stringify({anObject: "hi"})}`);
    });
});
