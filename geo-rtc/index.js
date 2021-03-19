import {geoRtcServer} from "./geortc.js";
import {GeoRTCClient} from "./geortc.js";

// sample client code
// server code
geoRtcServer.run('localhost', 3000)

// client code
let geoRtcClient = new GeoRTCClient('client-1')
// stream data usecase
let dataStream = geoRtcClient.streamData()
// null, if client is unable to use the usecase
if (dataStream != null) {
    dataStream.on('data', (data)=>{
        if (data.status == "incomplete") {
            console.log(data.data)
        }
    })
}

// console.log(geoRtcClient.getConfiguration())
// geoRtcClient.setConfiguration(geoRtcClient.getAvailableUsecases(), geoRtcClient.getAvailableDataTypes(), geoRtcClient.getAvailableDataTypes())
// console.log(geoRtcClient.getConfiguration())


//geortc.streamData()

export {geoRtcServer, GeoRTCClient}
