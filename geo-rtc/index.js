import {GeoRTC} from "./geortc.js";

// test code
let geortc = new GeoRTC('test')
geortc.run()
console.log(geortc.getConfiguration())
geortc.setConfiguration(geortc.getAvailableUsecases(), geortc.getAvailableDataTypes(), geortc.getAvailableDataTypes())
console.log(geortc.getConfiguration())
geortc.streamData()
// test code
export {GeoRTC}
