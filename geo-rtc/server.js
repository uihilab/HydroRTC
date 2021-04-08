
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
    this.peers = []

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
        let outerObj = this
        this.io.on("connection", (socket) => {

    
            socket.on('join', function(peer){
                peer["socketId"] = socket.id
                // TODO: check for unique peer name
                outerObj.peers.push(peer)
                console.log("peer (%s) joined: ",peer.name)
            })

            socket.on('validate-username', (data) =>{
                let found = false;
                let username = data.name
                for(let i = 0; i < outerObj.peers.length; i++) {
                    if (outerObj.peers[i].name == username) {
                        found = true;
                        break;
                    }
                }

                socket.emit('valid-username', {
                    'valid': !found
                })
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

            socket.on('peers-list', (peer) => {
                console.log("peer (%s) requested to get list of peers: ",peer.name)
                let list = []
                outerObj.peers.forEach(p=>{
                    list.push(p)
                })

                // broadcasting peers list to all connected peers

                outerObj.io.emit('peers', {
                    'data': list,
                    'status': 'complete'
                })
                
            })

            socket.on('request-peer', (data) => {
                console.log("peer (%s) requested to connected with peer (%s): ", data.requestorName, data.recieverPeerName)
                let receiverPeer;
                outerObj.peers.forEach(p=>{
                    if (p.name == data.recieverPeerName) {
                        receiverPeer = p
                    }
                })

                outerObj.io.to(receiverPeer.socketId).emit('connect-request', {
                    requestor: data.requestorName,
                    request: data.request
                })
                
            })

            socket.on('disconnect', function () {
                console.log('Client disconnected..');
             });
             

            // socket.on('request-accepted', (data) => {
            //     console.log("peer (%s) accepted request of peer (%s): ", data.acceptedBy, data.requestor)
            //     let receiverPeer;
            //     outerObj.peers.forEach(p=>{
            //         if (p.name == data.requestor) {
            //             receiverPeer = p
            //         }
            //     })

            //     outerObj.io.to(receiverPeer.socketId).emit('peer-accepted-request', {
            //         acceptedBy: data.acceptedBy
            //     })
                
            // })
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