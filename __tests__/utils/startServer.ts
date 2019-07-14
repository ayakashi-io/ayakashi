import {createServer} from "http";

export function createStaticServer(port: number, html: string) {
    const server = createServer(function(req, res) {
        if (req.url && req.url.match("/slow")) {
            setTimeout(function() {
                res.end(html);
            }, 5000);
        } else if (req.url && req.url.match("/json")) {
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({someData: 1}));
        } else if (req.url && req.url.match("/error")) {
            res.statusCode = 404;
            res.end("there was an error");
        } else if (req.url && req.url.match("/500error")) {
            res.statusCode = 500;
            res.end("internal server error");
        }    else {
            res.end(html);
        }
    });
    server.listen(port);

    return server;
}
