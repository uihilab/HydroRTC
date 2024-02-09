
const http = require('http')
const path = require('path');
const { createReadStream, readFile, readdirSync, exists, statSync } = require('fs')
const { Server } = require('socket.io')

var HydroRTCServer = function(){

    // server properties
    this.hostname = ""
    this.port = 0
    // list of connected peers
    this.peers = []
    // smart data sharing properties
    this.smartDataSharing = {
        "dataPath": "",
        "resolution": "",
        "frequency": "",
        "data": {}
    }

    // for sending smart data after configured interval
    this.smartDataInterval = null
    // list of tasks, server has for the peers
    this.tasks = []

    // configure server
    this.prepareServer = function(hostname, port) {
        this.hostname = hostname
        this.port = port
        this.server = http.createServer(function (request, response) {
            var uri = require('url').parse(request.url).pathname,
            filename = path.join(process.cwd(), uri);
    
            var isWin = !!process.platform.match(/^win/);
            // specifiying default home page of the library client application
            // TODO: allow library client to specify name and location of homepage file
            if (statSync(filename).isDirectory()) {
                if(!isWin) filename += '/index.html';
                else filename += '\\index.html';
            }
        
            // if home page exists then read its content and send back to client
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

        // initializing Server Socket.IO
        this.io = new Server(this.server, {})

        // accessing HydroRTCServer object
        let outerObj = this

        // on receiving connection request from client
        this.io.on("connection", (socket) => {

            socket.on('join', function(peer){

                peer["socketId"] = socket.id
                peer["has-stream-data"] = false
                
                // TODO: check for unique peer name
                outerObj.peers.push(peer)
                console.log("peer (%s) joined: ",peer.name)
            })

            socket.on('validate-username', (data) =>{
                // checks whether username is unique or not
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
                // finding requested peer
                outerObj.peers.forEach(p=>{
                    if (p.name == data.recieverPeerName) {
                        receiverPeer = p
                    }
                })

                // forwarding connection request to requested peer
                outerObj.io.to(receiverPeer.socketId).emit('connect-request', {
                    requestor: data.requestorName,
                    request: data.request,
                    'usecase': 'collaborative'
                })
                
            })


            socket.on('start-smart-data-sharing', (peer) => {

                console.log("peer (%s) requested to start smart data sharing: ",peer.name)

                outerObj.smartDataSharing.dataPath = peer.dataPath
                outerObj.smartDataSharing.resolution = peer.resolution
                outerObj.smartDataSharing.frequency = peer.frequency

                // reading images from data path folder

                let resolutions = getDirectories(outerObj.smartDataSharing.dataPath)
        
                resolutions.forEach(resolution=>{
                    let currDir = outerObj.smartDataSharing.dataPath+"/"+resolution+"/"
                    let rows = getDirectories(currDir)
                    outerObj.smartDataSharing.data[resolution] = {}
                    // will read first row for now
                    let count = 0
                    rows.forEach(row=>{
                        if (count < 1) {
                            let filenames = readdirSync(currDir+row+"/")  
                            outerObj.smartDataSharing.data[resolution][row]=filenames
                        }
                        count++
                    })
                    
                })                


                outerObj.smartDataInterval = outerObj.getSmartDataIntervalCallback(peer)
 
            })

            socket.on('update-smart-data-sharing', (peer) => {

                console.log("peer (%s) requested to update smart data configuration: ",peer.name)

                outerObj.smartDataSharing.resolution = peer.resolution
                outerObj.smartDataSharing.frequency = peer.frequency

                // clearing old smart data interval and creating new one based on updated properties
                clearInterval(this.smartDataInterval)
                this.smartDataInterval = outerObj.getSmartDataIntervalCallback(peer)

            })

            socket.on('get-task', (peer) => {

                console.log("peer (%s) requested for a task: ", peer.name)

                let peerNo = 0

                // Sending tasks to requestor peer
                // Here, we can configure to send specific task to specific peer
                outerObj.peers.forEach(p=>{
                    
                    if (peer.name == p.name) {
                        let taskNo = peerNo % this.tasks.length
                        
                        outerObj.io.to(p.socketId).emit('task', {
                            task: this.tasks[taskNo],
                            'usecase': 'distributed-data-analysis-and-processing'
                        })
                    }
                   
                    peerNo += 1
                })

            })
            
            socket.on('task-result', (peer) => {

                console.log("peer (%s) submitted result for a task (%s): ", (peer.name, peer.task))

                console.log("Result: (%s)", peer.result)

            })

            socket.on('disconnect', function () {
                console.log('Client disconnected..');
             });
             
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

    // callback to send smart data stream after configured interval
    this.getSmartDataIntervalCallback =  function(peer) {

        return setInterval(() => {
            let firstRow = Object.keys(this.smartDataSharing.data[this.smartDataSharing.resolution])[0]
            this.io.to(peer.socketId).emit('smart-data', {
                resolution: this.smartDataSharing.resolution,
                rowNo: firstRow,
                filename: this.smartDataSharing.data[this.smartDataSharing.resolution][firstRow][0],
                data: "",
                'usecase': 'smart-data'
            })
        }, parseInt(this.smartDataSharing.frequency)*1000)

    }

    this.runServer = function() {
        // TODO: check if server can run on given port and hostname or not
        this.server = this.server.listen(this.port, this.hostname, function() {
            let addr = this.address();
            console.log("Server listening at", addr.address + ":" + addr.port);
          
        })

    }

    this.setTasks = function(tasks) {
        this.tasks = tasks
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
        
this.server = new HydroRTCServer()