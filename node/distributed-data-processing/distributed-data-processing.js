module.exports = exports = Distributed_Data_Processing;

function Distributed_Data_Processing(app, tasks, server_id) {
    
    var io = require('socket.io').listen(app, {
        log: false,
        origins: '*:*'
    });

    io.set('transports', [
        'websocket', // 'disconnect' EVENT will work only with 'websocket'
        // 'xhr-polling',
        // 'jsonp-polling'
    ]);

    // // this RTCMultiConnection object is used to connect with existing users
    // var connection = initRTCMultiConnection(server_id);
    
    var listOfBroadcasts = {};
    var noOfPeers = 0
    io.on('connection', function(socket) {
        var currentUser;
        socket.on('join-broadcast', function(user) {
            currentUser = user;
            user.numberOfViewers = 0;
            user.socketId = socket.id;
            //if new broadcast id
            if (!listOfBroadcasts[user.broadcastid]) {
                listOfBroadcasts[user.broadcastid] = {
                    allusers: {},
                    broadcaster: undefined,
                    typeOfStreams: user.typeOfStreams // object-booleans: audio, video, screen
                };
            }

            let taskNo = noOfPeers %3
       
            socket.emit('start-broadcasting', listOfBroadcasts[user.broadcastid].typeOfStreams, 
                tasks[taskNo], [40, 10]);
            
            // socket.emit('start-broadcasting', listOfBroadcasts[user.broadcastid].typeOfStreams);

            console.log('User <', user.userid, '> has joined the broadcast ( ', user.broadcastid, ' ).');
            listOfBroadcasts[user.broadcastid].allusers[user.userid] = user;
            noOfPeers++;

        });


        socket.on('result', function(message) {
            console.log('Result from Peer ' + message.userid + ' (' + message.task + '): ' + message.result)
        });

        socket.on('disconnect', function() {
            // needs to be implemented
            
            // if (!currentUser) return;
            // if (!listOfBroadcasts[currentUser.broadcastid]) return;
            // if (listOfBroadcasts[currentUser.broadcastid].broadcaster.userid != currentUser.userid) return;

            // delete listOfBroadcasts[currentUser.broadcastid].broadcasters[currentUser.userid];
            // if (currentUser.isInitiator) {
            //     delete listOfBroadcasts[currentUser.broadcastid];
            // }
        });
        
    })

 
}
