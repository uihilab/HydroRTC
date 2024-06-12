// importing server from library
//const  { hydroRtcServer } = require('./node_modules/hydro-rtc/hydrortcserver.js');

//const { HydroRTC } = require('./node_modules/hydro-rtc/build/hydrortcserver.js');

const HydroRTC  = require('./node_modules/hydro-rtc/hydrortcserver.js')

//const HydroRTC = require('./node_modules/hydro-rtc/build/hydrortcserver.js')

//Arbitry location where a server should run. This needs to change when uploaded into a server.

const hydroRtcServer = new HydroRTC('my-server')
hydroRtcServer.run('localhost', 4000)
// configuring tasks, which will be distributed by servers
hydroRtcServer.setTasks(['flood-forecasting', 'flood-mapping', 'watershed-delineation'])
