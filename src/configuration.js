class Configuration {
    constructor() {
      this.usecases = [];
      this.receiveDataTypes = [];
      this.sendDataTypes = [];
    }

    /**
     * @method setUsecases
     * @memberof configuration
     * @param {Array} usecases - Usecases for the library instance 
     */  
    setUsecases(usecases) {
      this.usecases = usecases;
    }
  
    /**
     * @method setReceiveDataTypes
     * @memberof configuration
     * @param {Array} receiveDataTypes - Setter for receiving data types
     */
    setReceiveDataTypes(receiveDataTypes) {
      this.receiveDataTypes = receiveDataTypes;
    }

    /**
     * @method setSendDataTypes
     * @memberof configuration
     * @param {Array} sendDataTypes - Different data types that will be used throughout the library instance
     */
  
    setSendDataTypes(sendDataTypes) {
      this.sendDataTypes = sendDataTypes;
    }

    /**
     * @method getConfig
     * @returns {Object} - Contains the configuration that will be used throughout the library instance
     */  
    getConfig() {
      return {
        usecases: this.usecases,
        receiveDataTypes: this.receiveDataTypes,
        sendDataTypes: this.sendDataTypes,
      };
    }
  }
  
this.configuration = new Configuration();
  