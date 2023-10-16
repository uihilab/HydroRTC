// importing server from library
const  { hydroRtcServer } = require('./node_modules/hydro-rtc/hydrortcserver.js');

//Arbitry location where a server should run. This needs to change when uploaded into a server.
hydroRtcServer.run('localhost', 4000)
// configuring tasks, which will be distributed by servers
hydroRtcServer.setTasks(['flood-forecasting', 'flood-mapping', 'watershed-delineation'])
