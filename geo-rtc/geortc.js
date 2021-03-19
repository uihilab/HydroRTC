import {server} from './server.js'
import {configuration} from './configuration.js'
import {io} from 'socket.io-client'
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const events = require('events')
class GeoRTC {

    constructor(appName) {
        this.appName = appName
        this.server = server
    }

    run(hostname, port) {
        this.server.prepareServer(hostname, port)
        this.server.runServer()
    }
    
}

class GeoRTCClient {
    
    static usecases = ['stream-data', 'smart-data-transmission', 'distributed-data-processing', 
                        'decentralized-data-distribution', 'collaborative-data-exchange']

    static dataTypes = ['csv', 'xml', 'json', 'js', 'png']

    constructor(clientName) {
        // TODO: ensure server is run before client
        this.clientName = clientName
        this.configuration = configuration
        this.streamEventHandler = new events.EventEmitter()

        this.socket = io.connect('http://'+server.getAddress(), {reconnect: true});
        this.socket.emit('join',{
            'name': this.clientName
        })
        this.socketEventHandlers()
    }

    // in the configuration
    // user can enable / disable usecases
    // and types of data they can send / receive
    setConfiguration(usecases, receiveDataTypes, sendDataTypes) {
        // TODO: validate all inputs
        this.configuration.setUsecases(usecases)
        this.configuration.setReceiveDataTypes(receiveDataTypes)
        this.configuration.setSendDataTypes(sendDataTypes)
    }

    getConfiguration() {
        return this.configuration.getJSON()
    }

    getAvailableUsecases() {
        return GeoRTCClient.usecases
    }

    getAvailableDataTypes() {
        return GeoRTCClient.dataTypes
    }

    socketEventHandlers() {
        this.socket.on("connect", () => {
            console.log('Client (%s) Socket Connected with server: ', this.clientName);
        });
        this.socket.on('data-stream', (message)=>{
            this.streamEventHandler.emit('data', {'data':message.data,
                'status': message.status})
        })
    }

    streamData() {
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
    
}

const geoRtcServer = new GeoRTC('geortc')
export {geoRtcServer, GeoRTCClient}