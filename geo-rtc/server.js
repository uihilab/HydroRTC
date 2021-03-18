
import http from 'http'
import {createReadStream} from 'fs'

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

    streamData() {
        // default chunk size is 65536
        // to change the chunk size updated highWaterMark property
        // https://nodejs.org/api/fs.html#fs_fs_createreadstream_path_options

        let readStream = createReadStream('./data/sensor-data.txt', {'encoding': 'utf8', 'highWaterMark': 16*1024})
        readStream.on('data', function(chunk) {
            console.log("chunk")
            console.log(chunk);
            console.log("chunk")
        }).on('end', function() {
            console.log("end");
        });
    }
}

const server = new Server()
export {server}