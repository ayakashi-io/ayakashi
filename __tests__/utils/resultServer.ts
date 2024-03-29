import Express, {json} from "express";
//tslint:disable no-any
export type ResultServer = {
    close: () => Promise<void>,
    getResults: () => any[]
};

export function startResultServer(
    port: number
): Promise<ResultServer> {
    const app = Express();
    app.use(json());

    const results: unknown[] = [];

    app.post("/results", function(req, res) {
        results.push(req.body);
        res.json({status: "ok"});
    });

    return new Promise(function(resolve, reject) {
        const server = app.listen(port, function() {
            resolve({
                close: function() {
                    return new Promise((res, rej) => {
                        if (server) {
                            server.close(function(err) {
                                if (err) {
                                    rej(err);
                                } else {
                                    res();
                                }
                            });
                        } else {
                            res();
                        }
                    });
                },
                getResults: function() {
                    return results;
                }
            });
        }).on("error", function(err) {
            reject(err);
        });
    });
}
