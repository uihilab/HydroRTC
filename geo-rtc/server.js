
const http = require('http')
const createReadStream = require('fs').createReadStream
const readFile = require('fs').readFile
const exists = require('fs').exists
const statSync = require('fs').statSync
const Server = require('socket.io').Server
const createRequire = require('module').createRequire;
const path = require('path');

var GeoRTCServer = function(){

    this.hostname = ""
    this.port = 0

    this.prepareServer = function(hostname, port) {
        this.hostname = hostname
        this.port = port
        this.server = http.createServer(function (request, response) {
            var uri = require('url').parse(request.url).pathname,
            filename = path.join(process.cwd(), uri);
    
            var isWin = !!process.platform.match(/^win/);
        
            if (statSync(filename).isDirectory()) {
                if(!isWin) filename += '/index.html';
                else filename += '\\index.html';
            }
        
            exists(filename, function (exists) {
                if (!exists) {
                    response.writeHead(404, {
                        "Content-Type": "text/plain"
                    });
                    response.write('404 Not Found: ' + filename + '\n');
                    response.end();
                    return;
                }
        
                readFile(filename, 'binary', function (err, file) {
                    if (err) {
                        response.writeHead(500, {
                            "Content-Type": "text/plain"
                        });
                        response.write(err + "\n");
                        response.end();
                        return;
                    }
        
                    response.writeHead(200, { "Content-Type": "text/html"});
                    response.write(file, 'binary');
                    response.end();
                });
            });

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

    this.runServer = function() {
        // TODO: check if server can run on given port and hostname or not
        this.server = this.server.listen(this.port, this.hostname, function() {
            let addr = this.address();
            console.log("Server listening at", addr.address + ":" + addr.port);
          
        })

    }

    this.getAddress = function() {
        return this.hostname+":"+this.port
    }
}

this.server = new GeoRTCServer()