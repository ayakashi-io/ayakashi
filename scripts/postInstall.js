try {
    const opLog = require("../lib/opLog/opLog").getOpLog();

    opLog.messageBox([
        "Thanks for installing Ayakashi!",
        "Get started:",
        "https://ayakashi.io/docs/getting_started"
    ]);
} catch (_e) {}
