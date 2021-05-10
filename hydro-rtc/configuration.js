var Configuration = function(){

    this.usecases = []
    this.receiveDataTypes = []
    this.sendDataTypes = []

    

    this.setUsecases = function(usecases) {
        this.usecases = usecases
    }

    this.setReceiveDataTypes = function(receiveDataTypes) {
        this.receiveDataTypes = receiveDataTypes
    }

    this.setSendDataTypes = function(sendDataTypes) {
        this.sendDataTypes = sendDataTypes
    }

    this.getJSON = function(){
        return {
            'usecases' : this.usecases,
            'receiveDataTypes' : this.receiveDataTypes,
            'sendDataTypes' : this.sendDataTypes
        }
    }

}


this.configuration = new Configuration()
