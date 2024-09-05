const HydroRTCServer = require('./server.js')

/**
 * @class HydroRTC
 * @description Main class instatiator for the server implementation.
 */
class HydroRTC {
  //Users should be able to pass their own app instantiator and server port.
    constructor(appName) {
      this.appName = appName;
      this.server = new HydroRTCServer();
    }

    /**
     * Triggers the run for the server given a host and port
     * @param {String} hostname - For development purposes, it can be localhost 
     * @param {NUmber} port - For development purposes, any available port from the local machine 
     */  
    run(hostname, port) {
      this.server.prepareServer(hostname, port);
      this.server.runServer();
    }

    /**
     * Allows for tasks to be set into a specific users. See documentation for the types of tasks and/or distribtuon that can be done
     * @param {Array} tasks - Array of tasks to be set into the . This is an auxiliary method that will be further improved.
     */  
    setTasks(tasks) {
      this.server.setTasks(tasks);
    }
  }

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HydroRTC;
} else if (typeof window !== 'undefined') {
  window.HydroRTC = HydroRTC;
}