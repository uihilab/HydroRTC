// importing server from library
const HydroRTC = require('./node_modules/hydro-rtc/hydrortcserver.js')

const hydroRtcServer = new HydroRTC('my-server')

hydroRtcServer.run('localhost', 8000)

// configuring tasks, which will be distributed by servers

hydroRtcServer.setTasks(['flood-forecasting', 'flood-mapping', 'watershed-delineation'])
