// importing server from library
const hydroRtcServer = require('hydro-rtc/hydrortcserver.js').hydroRtcServer;

hydroRtcServer.run('localhost', 8888)
// configuring tasks, which will be distributed by servers
hydroRtcServer.setTasks(['flood-forecasting', 'flood-mapping', 'watershed-delineation'])
