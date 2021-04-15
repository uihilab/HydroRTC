
const http = require('http')
const fs = require('fs');
const createReadStream = require('fs').createReadStream
const readFile = require('fs').readFile
const readdirSync = require('fs').readdirSync
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
                peer["has-stream-data"] = false
                
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

                let streamDataPeer = outerObj.getPeerwithStreamData()

                // if there is a peer with stream data
                if (streamDataPeer) {
                    // sending the request to that peer to send data to requesting peer
                    outerObj.io.to(streamDataPeer.socketId).emit('connect-request', {
                        requestor: peer.name,
                        request: 'streamData',
                        'usecase': 'decentralized'
                    })

                } else {
                    // TODO: Let client of the library specify data path
                    let readStream = createReadStream('./data/sensor-data.txt', {'encoding': 'utf8', 'highWaterMark': 16*1024})

                    readStream.on('data', function(chunk) {
                        
                        socket.emit('data-stream', {
                            'data': chunk,
                            'status': 'incomplete',
                            "peer": null
                        })

                    }).on('end', function() {
                        
                        socket.emit('data-stream', {
                            'data': "",
                            'status': 'complete'
                        })

                        outerObj.updatePeerProperty(peer.name, "has-stream-data", true)
         
                    });
                }   
            })
            

            socket.on('peers-list', (peer) => {

                console.log("peer (%s) requested to get list of peers: ", peer.name)
                
                let list = []
                
                outerObj.peers.forEach(p=>{
                    
                    list.push(p)
                   
                })

                // broadcasting peers list to all connected peers

                outerObj.io.emit('peers', {
                    'peers': list,
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
                    request: data.request,
                    'usecase': 'collaborative'
                })
                
            })

            socket.on('start-smart-data-sharing', (peer) => {

                console.log("peer (%s) requested to start smart data sharing: ",peer.name)

                let dataPath = peer.dataPath
                let requestedResolution = peer.resolution

                // reading images from data path folder
                
                let imageData = {}

                let resolutions = getDirectories(dataPath)

                resolutions.forEach(resolution=>{
                    let currDir = dataPath+"/"+resolution+"/"
                    let rows = getDirectories(currDir)
                    imageData[resolution] = {}
                    // will read first row for now
                    let count = 0
                    rows.forEach(row=>{
                        if (count < 1) {
                            let filenames = fs.readdirSync(currDir+row+"/")  
                            imageData[resolution][row]=filenames
                        }
                        count++
                    })
            
                })


                let firstRow = Object.keys(imageData[requestedResolution])[0]

                outerObj.io.to(peer.socketId).emit('smart-data', {
                    resolution: requestedResolution,
                    rowNo: firstRow,
                    filename: imageData[requestedResolution][firstRow][0],
                    data: "",
                    'usecase': 'smart-data'
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

    this.updatePeerProperty = (peerName, property, value) => {

        for(let i = 0; i < this.peers.length; i++) {
            if (this.peers[i].name == peerName) {
                this.peers[i][property] = value
            }
        }

        return null
    }

    this.getPeerwithStreamData = () => {

        // get most recent peer

        let totalPeers =  this.peers.length

        for(let i = totalPeers - 1; i >= 0; i--) {

            if (this.peers[i]["has-stream-data"]) {
                return this.peers[i]
            }
        }

        return null
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

// --- utiltity functions ---
const getDirectories = source =>
    readdirSync(source, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)

this.server = new GeoRTCServer()