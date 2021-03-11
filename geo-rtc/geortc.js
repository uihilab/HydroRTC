import {Server} from './server.js'
class GeoRTC {
    
    constructor(appName) {
        this.appName = appName
    }

    createServer(port) {
        // Todo: check whether port is available or not
        this.server = new Server(port)
        this.server.prepareServer()
        return this.server
    }
    
}

export {GeoRTC}