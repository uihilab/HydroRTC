import {GeoRTC} from "./geortc.js";

// test code
let geortc = new GeoRTC('test')
let server = geortc.createServer(8080)
server.runServer()
console.log(geortc.getConfiguration())
geortc.setConfiguration(geortc.getAvailableUsecases(), geortc.getAvailableDataTypes(), geortc.getAvailableDataTypes())
console.log(geortc.getConfiguration())
// test code
export {GeoRTC}
