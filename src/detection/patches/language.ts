export default function() {
    Object.defineProperty(navigator, "languages", {
        get: function() {
            return ["en-US", "en"];
        }
    });
}
