import {server} from './server.js'
import {configuration} from './configuration.js'
import {io} from 'socket.io-client'
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
        const socket = io.connect('http://'+server.getAddress(), {reconnect: true});
        // client-side
        socket.on("connect", () => {
            console.log('Client (%s) Socket Connected with server: ', clientName);
        });
        socket.emit('join',{
            'name': clientName
        })
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

    // streamData() {
    //     // this.socket.emit('join', {
            
    //     // })
    //     // TODO: check if peer is eligible to stream data or not
    //     this.server.streamData()
    // }
    
}

const geoRtcServer = new GeoRTC('geortc')
export {geoRtcServer, GeoRTCClient}