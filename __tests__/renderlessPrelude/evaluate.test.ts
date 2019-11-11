//tslint:disable
import "jest-extended";
//tslint:enable
import http from "http";
import {createStaticServer} from "../utils/startServer";
import {getRandomPort} from "../../src/utils/getRandomPort";
import {getAyakashiInstance} from "../utils/getRenderlessAyakashiInstance";

let staticServerPort: number;
let staticServer: http.Server;

jest.setTimeout(600000);

describe("evaluate expressions", function() {
    beforeAll(async function() {
        staticServerPort = await getRandomPort();
        staticServer = createStaticServer(staticServerPort,
            `
            <html>
                <head>
                    <title>test page</title>
                </head>
                <body>
                    <div class="container">
                        <a href="http://example.com" class="links">link1</a>
                    </div>
                    <div class="container">
                        <a href="http://example.com" class="links">link2</a>
                    </div>
                    <div class="container">
                        <a href="http://example.com" class="links">link3</a>
                    </div>
                </body>
            </html>
            `
        );
    });

    afterAll(function(done) {
        staticServer.close(function() {
            done();
        });
    });

    test("can evaluate async expressions", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        const result = await ayakashiInstance.evaluateAsync(function(num) {
            return new Promise(function(resolve) {
                setTimeout(function() {
                    resolve(num);
                }, 20);
            });
        }, 1);
        expect(result).toBe(1);
        await ayakashiInstance.__connection.release();
    });

    test("can pass arguments to evaluate", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        const result = await ayakashiInstance.evaluate(function(num) {
            return num;
        }, 1);
        expect(result).toBe(1);
        await ayakashiInstance.__connection.release();
    });

    test("can pass multiple arguments to evaluate", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        const result = await ayakashiInstance.evaluate(function(a, b) {
            return [a, b];
        }, 1, "hello");
        expect(result[0]).toBe(1);
        expect(result[1]).toBe("hello");
        await ayakashiInstance.__connection.release();
    });

    test("can pass objects to evaluate", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        const result = await ayakashiInstance.evaluate(function(param) {
            return param.num;
        }, {num: 1});
        expect(result).toBe(1);
        await ayakashiInstance.__connection.release();
    });

    test("can pass functions to evaluate", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        const result = await ayakashiInstance.evaluate(function(fn) {
            return fn();
        }, function() { return 1; });
        expect(result).toBe(1);
        await ayakashiInstance.__connection.release();
    });

    test("can pass arrow functions to evaluate", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        const result = await ayakashiInstance.evaluate(function(fn) {
            return fn();
        }, () => 1);
        expect(result).toBe(1);
        await ayakashiInstance.__connection.release();
    });

    test("can pass nested functions to evaluate", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        const result = await ayakashiInstance.evaluate(function(param) {
            return param.myFn();
        }, {myFn: function() { return 1; }});
        expect(result).toBe(1);
        await ayakashiInstance.__connection.release();
    });

    test("can pass nested arrow functions to evaluate", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        const result = await ayakashiInstance.evaluate(function(param) {
            return param.myFn();
        }, {myFn: () => 1});
        expect(result).toBe(1);
        await ayakashiInstance.__connection.release();
    });

    test("can return a function from evaluate", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        const result = await ayakashiInstance.evaluate(function() {
            return function() { return 1; };
        });
        expect(result()).toBe(1);
        await ayakashiInstance.__connection.release();
    });

    test("can return a nested function from evaluate", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        const result = await ayakashiInstance.evaluate(function() {
            return {myFun: function() { return 1; }};
        });
        expect(result.myFun()).toBe(1);
        await ayakashiInstance.__connection.release();
    });

    test("can pass a function back and forth", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        const result = await ayakashiInstance.evaluate(function(param) {
            return param;
        }, function() { return 1; });
        expect(result()).toBe(1);
        await ayakashiInstance.__connection.release();
    });

    test("can pass a nested function back and forth", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        const result = await ayakashiInstance.evaluate(function(param) {
            return param;
        }, {myFun: function() { return 1; }});
        expect(result.myFun()).toBe(1);
        await ayakashiInstance.__connection.release();
    });

    test("'this' inside evaluate points to ayakashi page", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        const result = await ayakashiInstance.evaluate(function() {
            return "window" in this;
        });
        expect(result).toBe(true);
        await ayakashiInstance.__connection.release();
    });

    test("can return a regex from evaluate", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        const result = await ayakashiInstance.evaluate(function() {
            return /hello/;
        });
        expect(result.test("hello there")).toBe(true);
        await ayakashiInstance.__connection.release();
    });

    test("can return a nested regex from evaluate", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        const result = await ayakashiInstance.evaluate(function() {
            return {myRegex: /hello/};
        });
        expect(result.myRegex.test("hello there")).toBe(true);
        await ayakashiInstance.__connection.release();
    });

    test("can pass regexes to evaluate", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        const result = await ayakashiInstance.evaluate(function(param) {
            return param.test("hello there");
        }, /hello/);
        expect(result).toBe(true);
        await ayakashiInstance.__connection.release();
    });

    test("can pass nested regexes to evaluate", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        const result = await ayakashiInstance.evaluate(function(param) {
            return param.myRegex.test("hello there");
        }, {myRegex: /hello/});
        expect(result).toBe(true);
        await ayakashiInstance.__connection.release();
    });

    test("can pass a regex back and forth", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        const result = await ayakashiInstance.evaluate(function(param) {
            return param;
        }, /hello/);
        expect(result.test("hello there")).toBe(true);
        await ayakashiInstance.__connection.release();
    });

    test("can pass a nested regex back and forth", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        const result = await ayakashiInstance.evaluate(function(param) {
            return param;
        }, {myRegex: /hello/});
        expect(result.myRegex.test("hello there")).toBe(true);
        await ayakashiInstance.__connection.release();
    });

    test("throws an error if evaluate throws an error", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        await expect((async function() {
            await ayakashiInstance.evaluate(function() {
                throw new Error("test error!");
            });
        })()).rejects.toThrow();
        await ayakashiInstance.__connection.release();
    });

    test("throws an error if evaluateAsync returns a rejected promise", async function() {
        const ayakashiInstance = await getAyakashiInstance();
        await ayakashiInstance.load(`http://localhost:${staticServerPort}`);
        await expect((async function() {
            await ayakashiInstance.evaluateAsync(function() {
                return new Promise(function(_, reject) {
                    setTimeout(function() {
                        reject(new Error("test error!"));
                    }, 20);
                });
            });
        })()).rejects.toThrow();
        await ayakashiInstance.__connection.release();
    });
});
