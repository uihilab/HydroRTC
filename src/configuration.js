class Configuration {
    constructor() {
      this.usecases = [];
      this.receiveDataTypes = [];
      this.sendDataTypes = [];
    }

    /**
     * 
     * @param {*} usecases 
     */  
    setUsecases(usecases) {
      this.usecases = usecases;
    }
  
    /**
     * 
     * @param {*} receiveDataTypes 
     */
    setReceiveDataTypes(receiveDataTypes) {
      this.receiveDataTypes = receiveDataTypes;
    }

    /**
     * 
     * @param {*} sendDataTypes 
     */
  
    setSendDataTypes(sendDataTypes) {
      this.sendDataTypes = sendDataTypes;
    }

    /**
     * 
     * @returns 
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
  