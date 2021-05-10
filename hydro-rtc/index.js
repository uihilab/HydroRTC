// this.hydroRtcServer = require("./build/hydrortc.js").hydroRtcServer
// this.HydroRTCClient = require("./build/hydrortc.js").HydroRTCClient

//sample client code
//server code
// hydroRtcServer.run('localhost', 3000)

// client code
// let hydroRtcClient = new HydroRTCClient('client-1')
// // stream data usecase
// let dataStream = hydroRtcClient.streamData()
// // null, if client is unable to use the usecase
// if (dataStream != null) {
//     dataStream.on('data', (data)=>{
//         if (data.status == "incomplete") {
//             console.log(data.data)
//         }
//     })
// }

// console.log(hydroRtcClient.getConfiguration())
// hydroRtcClient.setConfiguration(hydroRtcClient.getAvailableUsecases(), hydroRtcClient.getAvailableDataTypes(), hydroRtcClient.getAvailableDataTypes())
// console.log(hydroRtcClient.getConfiguration())


//hydrortc.streamData()
