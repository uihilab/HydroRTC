const server = require('./server.js').server
const configuration = require('./configuration.js').configuration
const io = require('socket.io-client').io
const events = require('events')

var GeoRTC = function(appName) {
    
    this.appName = appName
    this.server = server
    

    this.run = function(hostname, port) {
        this.server.prepareServer(hostname, port)
        this.server.runServer()
    }
    
}

this.GeoRTCClient = function(clientName) {
    
    let usecases = ['stream-data', 'smart-data-transmission', 'distributed-data-processing', 
                        'decentralized-data-distribution', 'collaborative-data-exchange']

    let dataTypes = ['csv', 'xml', 'json', 'js', 'png']

    // in the configuration
    // user can enable / disable usecases
    // and types of data they can send / receive
    this.setConfiguration = function (usecases, receiveDataTypes, sendDataTypes) {
        // TODO: validate all inputs
        this.configuration.setUsecases(usecases)
        this.configuration.setReceiveDataTypes(receiveDataTypes)
        this.configuration.setSendDataTypes(sendDataTypes)
    }

    this.getConfiguration = function() {
        return this.configuration.getJSON()
    }

    this.getAvailableUsecases = function() {
        return usecases
    }

    this.getAvailableDataTypes = function() {
        return dataTypes
    }

    this.socketEventHandlers = function() {
        this.socket.on("connect", () => {
            console.log('Client (%s) Socket Connected with server: ', this.clientName);
        });
        this.socket.on('data-stream', (message)=>{
            this.streamEventHandler.emit('data', {'data':message.data,
                'status': message.status})
        })
    }

    this.streamData = function() {
        if (!this.configuration.usecases.includes('stream-data')) {
            let socketId = this.socket.id
            this.socket.emit('stream-data', {
                name: this.clientName,
                socketId: socketId
            })

            return this.streamEventHandler;
        } else {
            console.log('Client (%s) is not eligible to use stream-data usecase.', this.clientName)
            return null;
        }
    }

    // init
    // TODO: ensure server is run before client
    this.clientName = clientName
    this.configuration = configuration
    this.streamEventHandler = new events.EventEmitter()
    
    this.socket = io();
    this.socket.emit('join',{
        'name': this.clientName
    })
    this.socketEventHandlers()
    
}

this.geoRtcServer = new GeoRTC('geortc')
