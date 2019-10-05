import net from "net";
import http from "http";
import {retryOnErrorOrTimeOut} from "./retryOnErrorOrTimeout";

export function getRandomPort(): Promise<number> {
    return retryOnErrorOrTimeOut<number>(function() {
        return new Promise(function(resolve, reject) {
            const server = http.createServer();
            server.listen(0);
            server.once("listening", () => {
                const addressInfo = <net.AddressInfo>server.address();
                server.close(() => resolve(addressInfo.port));
            });
            server.once("error", reject);
        });
    });
}
