// importing server from library

const HydroRTC = require('./node_modules/hydro-rtc/hydrortcserver.js')

const hydroRtcServer = new HydroRTC('my-server')
hydroRtcServer.run('localhost', 2000)
// configuring tasks, which will be distributed by servers
hydroRtcServer.setTasks(['smart-data-transmission'])
