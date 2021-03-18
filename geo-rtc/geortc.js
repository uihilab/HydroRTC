import {server} from './server.js'
import {configuration} from './configuration.js'
class GeoRTC {
    
    static usecases = ['stream-data', 'smart-data-transmission', 'distributed-data-processing', 
                        'decentralized-data-distribution', 'collaborative-data-exchange']

    static dataTypes = ['csv', 'xml', 'json', 'js', 'png']

    constructor(appName) {
        this.appName = appName
        this.server = server
        this.configuration = configuration
        
    }

    run() {
        this.server.prepareServer()
        this.server.runServer()
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
        return GeoRTC.usecases
    }

    getAvailableDataTypes() {
        return GeoRTC.dataTypes
    }

    streamData() {
        // TODO: check if peer is eligible to stream data or not
        this.server.streamData()
    }
    
}

export {GeoRTC}