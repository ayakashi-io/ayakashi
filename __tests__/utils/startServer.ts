import {createServer} from "http";

export function createStaticServer(port: number, html: string) {
    const server = createServer(function(req, res) {
        if (req.url && req.url.match("/slow")) {
            setTimeout(function() {
                res.end(html);
            }, 5000);
        } else {
            res.end(html);
        }
    });
    server.listen(port);

    return server;
}
