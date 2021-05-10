const server = require('./server.js').server

var HydroRTC = function(appName) {
    
    this.appName = appName
    this.server = server
    

    this.run = function(hostname, port) {
        this.server.prepareServer(hostname, port)
        this.server.runServer()
    }

    this.setTasks = function(tasks) {
        this.server.setTasks(tasks)
    }
    
}

this.hydroRtcServer = new HydroRTC('hydrortc')