import {geoRtcServer} from "./geortc.js";
import {GeoRTCClient} from "./geortc.js";

// sample client code
// server code
geoRtcServer.run('localhost', 3000)

// client code
let geoRtcClient = new GeoRTCClient('client-1')

// console.log(geoRtcClient.getConfiguration())
// geoRtcClient.setConfiguration(geoRtcClient.getAvailableUsecases(), geoRtcClient.getAvailableDataTypes(), geoRtcClient.getAvailableDataTypes())
// console.log(geoRtcClient.getConfiguration())


//geortc.streamData()

export {geoRtcServer, GeoRTCClient}
