export default function() {
    const pluginArray = getPluginArray();

    const pdfPlugin = getPlugin();
    pdfPlugin[0] = MimeType;
    pdfPlugin["application/x-google-chrome-pdf"] = MimeType;
    Object.defineProperty(pdfPlugin, "name", {
        get: function() {
            return "Chrome PDF Plugin";
        }
    });
    Object.defineProperty(pdfPlugin, "filename", {
        get: function() {
            return "internal-pdf-viewer";
        }
    });
    Object.defineProperty(pdfPlugin, "description", {
        get: function() {
            return "Portable Document Format";
        }
    });

    pluginArray[0] = pdfPlugin;

    const pdfViewer = getPlugin();
    pdfViewer[0] = MimeType;
    pdfViewer["application/pdf"] = MimeType;
    Object.defineProperty(pdfViewer, "name", {
        get: function() {
            return "Chrome PDF Viewer";
        }
    });
    Object.defineProperty(pdfViewer, "filename", {
        get: function() {
            return "mhjfbmdgcfjbbpaeojofohoefgiehjai";
        }
    });
    Object.defineProperty(pdfViewer, "description", {
        get: function() {
            return "";
        }
    });

    pluginArray[1] = pdfViewer;

    const nativeClient = getPlugin();
    nativeClient[0] = MimeType;
    nativeClient[1] = MimeType;
    nativeClient["application/x-nacl"] = MimeType;
    nativeClient["application/x-pnacl"] = MimeType;
    Object.defineProperty(nativeClient, "name", {
        get: function() {
            return "Native Client";
        }
    });
    Object.defineProperty(nativeClient, "filename", {
        get: function() {
            return "internal-nacl-plugin";
        }
    });
    Object.defineProperty(nativeClient, "description", {
        get: function() {
            return "";
        }
    });

    pluginArray[2] = nativeClient;

    Object.defineProperty(navigator, "plugins", {
        get: function() {
            return pluginArray;
        }
    });
}

function getPluginArray() {
    function myPluginArray() {}
    //@ts-ignore
    const pluginArray = new myPluginArray();
    Object.defineProperty(pluginArray, "length", {
        get: function() {
            return 3;
        }
    });
    Object.setPrototypeOf(pluginArray, PluginArray.prototype);

    return pluginArray;
}

function MyPlugin() {}

function getPlugin() {
    //@ts-ignore
    const plugin = new MyPlugin();
    Object.setPrototypeOf(plugin, Plugin.prototype);
    Object.defineProperty(plugin, "length", {
        get: function() {
            return 1;
        }
    });

    return plugin;
}
