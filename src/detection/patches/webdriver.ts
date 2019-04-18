export default function() {
    Object.defineProperty(navigator, "webdriver", {
        get: () => undefined
    });
}
