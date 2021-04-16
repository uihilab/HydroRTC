const geoRtcServer = require('geo-rtc/geortcserver.js').geoRtcServer;

// mechanism to allow the sample project to specify 
// list of data that they can share
geoRtcServer.run('localhost', 8888)
geoRtcServer.setTasks(['flood-forecasting', 'flood-mapping', 'watershed-delineation'])
