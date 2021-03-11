import {server} from './server.js'
import {configuration} from './configuration.js'
class GeoRTC {
    
    static usecases = ['stream-data', 'smart-data-transmission', 'distributed-data-processing', 
                        'decentralized-data-distribution', 'collaborative-data-exchange']

    static dataTypes = ['csv', 'xml', 'json', 'js', 'png']

    constructor(appName) {
        this.appName = appName
        this.configuration = configuration
        
    }

    createServer(port) {
        // Todo: check whether port is available or not
        this.server = server
        this.server.port = port
        this.server.prepareServer()
        return this.server
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
    
}

export {GeoRTC}