
module.exports = exports = Smart_Data_Sharing;

function Smart_Data_Sharing(app, file_data, server_id) {
    
    var io = require('socket.io').listen(app, {
        log: false,
        origins: '*:*'
    });

    io.set('transports', [
        'websocket', // 'disconnect' EVENT will work only with 'websocket'
        'xhr-polling',
        'jsonp-polling'
    ]);

    // // this RTCMultiConnection object is used to connect with existing users
    // var connection = initRTCMultiConnection(server_id);
    
    var listOfBroadcasts = {};

    io.on('connection', function(socket) {
        var currentUser;
        socket.on('join-broadcast', function(user) {
            currentUser = user;
            user.numberOfViewers = 0;
            // if new broadcast id
            if (!listOfBroadcasts[user.broadcastid]) {
                listOfBroadcasts[user.broadcastid] = {
                    allusers: {},
                    broadcaster: undefined,
                    typeOfStreams: user.typeOfStreams // object-booleans: audio, video, screen
                };

            }

            var broadcaster = getBroadcaster(user);
            if (broadcaster) {
                listOfBroadcasts[user.broadcastid].broadcaster.numberOfViewers++;
                socket.emit('join-broadcaster', broadcaster, listOfBroadcasts[user.broadcastid].typeOfStreams);
                console.log('User <', user.userid, '> is trying to get stream from user <', broadcaster.userid, '>');

            } else {
                currentUser.isInitiator = true;
                listOfBroadcasts[user.broadcastid].broadcaster = user;
                socket.emit('start-broadcasting', listOfBroadcasts[user.broadcastid].typeOfStreams, file_data);
                console.log('User <', user.userid, '> will serve broadcast ( ', user.broadcastid, ' ).');
            }
            // socket.emit('start-broadcasting', listOfBroadcasts[user.broadcastid].typeOfStreams);

            console.log('User <', user.userid, '> has joined the broadcast ( ', user.broadcastid, ' ).');
            listOfBroadcasts[user.broadcastid].allusers[user.userid] = user;

        });

        socket.on('message', function(message) {
            socket.broadcast.emit('message', message);
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

        function getBroadcaster(user) {
            var broadcaster = listOfBroadcasts[user.broadcastid].broadcaster;
            // for (var userid in broadcasters) {
            //     if (broadcasters[userid].numberOfViewers <= 3) {
            //         firstResult = broadcasters[userid];
            //         continue;
            //     } else delete listOfBroadcasts[user.broadcastid].broadcasters[userid];
            // }
            return broadcaster;
        }
        
    })

 
}
