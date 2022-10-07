try {
    const opLog = require("../lib/opLog/opLog").getOpLog();

    opLog.messageBox([
        "Thanks for installing Ayakashi!",
        "Get started:",
        "https://ayakashi-io.github.io"
    ]);
} catch (_e) {}
