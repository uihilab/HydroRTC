const hydroRtcServer = require('hydro-rtc/hydrortcserver.js').hydroRtcServer;

// mechanism to allow the sample project to specify 
// list of data that they can share
hydroRtcServer.run('localhost', 8888)
hydroRtcServer.setTasks(['flood-forecasting', 'flood-mapping', 'watershed-delineation'])
