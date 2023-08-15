// importing server from library
const  { hydroRtcServer } = require('hydro-rtc/hydrortcserver.js');

hydroRtcServer.run('localhost', 8000)
// configuring tasks, which will be distributed by servers
hydroRtcServer.setTasks(['flood-forecasting', 'flood-mapping', 'watershed-delineation'])
