import {server} from './server.js'
import {configuration} from './configuration.js'
import {io} from 'socket.io-client'
class GeoRTC {

    constructor(appName) {
        this.appName = appName
        this.server = server
    }

    run() {
        this.server.prepareServer()
        this.server.runServer()
    }
    
}

class GeoRTCClient {
    
    static usecases = ['stream-data', 'smart-data-transmission', 'distributed-data-processing', 
                        'decentralized-data-distribution', 'collaborative-data-exchange']

    static dataTypes = ['csv', 'xml', 'json', 'js', 'png']

    constructor(clientName) {
        this.clientName = clientName
        this.configuration = configuration
        this.socket = io();
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