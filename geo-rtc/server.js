
import http from 'http'

class Server {

    prepareServer() {
        this.server = http.createServer(function (request, response) {
            response.writeHead(200)
            response.end("Request received.")
        })
    }

    runServer() {
        this.server = this.server.listen(process.env.PORT || 8888, process.env.IP || "0.0.0.0", function() {
            var addr = this.address();
            console.log("Server listening at", addr.address + ":" + addr.port);
        })
    }
}

const server = new Server()
export {server}