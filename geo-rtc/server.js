
import http from 'http'

class Server {
    constructor(port) {
        this.port = port
    }

    prepareServer() {
        this.server = http.createServer(function (request, response) {
            response.writeHead(200)
            response.end("Request received.")
        })
    }

    runServer() {
        this.server = this.server.listen(this.port, function() {
            var addr = this.address();
            console.log("Server listening at", addr.address + ":" + addr.port);
        })
    }
}

export {Server}