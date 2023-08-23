const { server } = require('./server.js')

/**
 * @class HydroRTC
 * @description Main class instatiator for the server implementation.
 */
class HydroRTC {
    constructor(appName, server) {
      this.appName = appName;
      this.server = server;
    }
  
    run(hostname, port) {
      this.server.prepareServer(hostname, port);
      this.server.runServer();
    }
  
    setTasks(tasks) {
      this.server.setTasks(tasks);
    }
  }
  

this.hydroRtcServer = new HydroRTC('hydrortc', server)