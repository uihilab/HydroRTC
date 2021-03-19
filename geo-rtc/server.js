
import http from 'http'
import {createReadStream} from 'fs'
import {Server} from 'socket.io'
class GeoRTCServer {

    constructor() {
        this.hostname = ""
        this.port = 0
    }

    prepareServer(hostname, port) {
        this.hostname = hostname
        this.port = port
        this.server = http.createServer(function (request, response) {
            response.writeHead(200)
            response.end("Request received.")
        })


        this.io = new Server(this.server, {})
        this.io.on("connection", (socket) => {
            socket.on('join', function(peer){
                console.log("peer (%s) joined: ",peer.name)
            })

            socket.on('stream-data', (peer) => {
                console.log("peer (%s) requested to stream data: ",peer.name)
                // default chunk size is 65536
                // to change the chunk size updated highWaterMark property
                // https://nodejs.org/api/fs.html#fs_fs_createreadstream_path_options
                let readStream = createReadStream('./data/sensor-data.txt', {'encoding': 'utf8', 'highWaterMark': 16*1024})
                readStream.on('data', function(chunk) {
                    socket.emit('data-stream', {
                        'data': chunk,
                        'status': 'incomplete'
                    })
                }).on('end', function() {
                    socket.emit('data-stream', {
                        'data': "",
                        'status': 'complete'
                    })
                });
                
            })
        })

   
    }

    runServer() {
        // TODO: check if server can run on given port and hostname or not
        this.server = this.server.listen(this.port, this.hostname, function() {
            let addr = this.address();
            console.log("Server listening at", addr.address + ":" + addr.port);
          
            
        })
    }

    getAddress() {
        return this.hostname+":"+this.port
    }
}

const server = new GeoRTCServer()
export {server}