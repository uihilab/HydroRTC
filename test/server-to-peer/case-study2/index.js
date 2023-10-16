// importing server from library
const  { hydroRtcServer } = require('./node_modules/hydro-rtc/hydrortcserver.js');

hydroRtcServer.run('localhost', 2000)
// configuring tasks, which will be distributed by servers
hydroRtcServer.setTasks(['flood-forecasting', 'flood-mapping', 'watershed-delineation'])
