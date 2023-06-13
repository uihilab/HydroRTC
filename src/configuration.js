class Configuration {
    constructor() {
      this.usecases = [];
      this.receiveDataTypes = [];
      this.sendDataTypes = [];
    }
  
    setUsecases(usecases) {
      this.usecases = usecases;
    }
  
    setReceiveDataTypes(receiveDataTypes) {
      this.receiveDataTypes = receiveDataTypes;
    }
  
    setSendDataTypes(sendDataTypes) {
      this.sendDataTypes = sendDataTypes;
    }
  
    getJSON() {
      return {
        usecases: this.usecases,
        receiveDataTypes: this.receiveDataTypes,
        sendDataTypes: this.sendDataTypes,
      };
    }
  }
  
  const configuration = new Configuration();
  