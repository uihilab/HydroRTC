class GeoRTC {
    
    constructor(appName) {
        this.appName = appName
    }

    createServer(host, port) {
        return "Server (host:  " + host + ", port: " + port + ")"
    }
    
}

export {GeoRTC}