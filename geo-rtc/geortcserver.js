const server = require('./server.js').server

var GeoRTC = function(appName) {
    
    this.appName = appName
    this.server = server
    

    this.run = function(hostname, port) {
        this.server.prepareServer(hostname, port)
        this.server.runServer()
    }
    
}

this.geoRtcServer = new GeoRTC('geortc')