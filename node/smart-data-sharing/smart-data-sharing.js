module.exports = exports = Smart_Data_Sharing;

function Smart_Data_Sharing(app, file_data, server_id) {
    
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
            let data = file_data.split("\n")
            let firstChunk = data[0]
            

            socket.emit('start-broadcasting', listOfBroadcasts[user.broadcastid].typeOfStreams, firstChunk);
            
            // socket.emit('start-broadcasting', listOfBroadcasts[user.broadcastid].typeOfStreams);

            console.log('User <', user.userid, '> has joined the broadcast ( ', user.broadcastid, ' ).');
            listOfBroadcasts[user.broadcastid].allusers[user.userid] = user;

            
            let i = 1
            setInterval((function fn() {
                if (i < data.length) {
                    // appending data to client that is broadcasting
                    socket.emit(user.userid+'-get-stream', data[i]);

                    i+=1;
                }
                return fn;
                })(), user.deliveryPriority*1000);

        });


        // socket.on('message', function(message) {
        //     socket.broadcast.emit('message', message);
        // });

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
