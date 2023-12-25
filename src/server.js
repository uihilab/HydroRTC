//Required Imports
const { createServer } = require("http");
const { parse } = require("url");
const { join } = require("path");
const {
  createReadStream,
  readdirSync,
  statSync,
  promises: fsPromises,
  readFileSync,
} = require("fs");
const { Server } = require("socket.io");
const { instrument } = require("@socket.io/admin-ui");
const { NetCDFReader } = require("netcdfjs");
//To implement
const { GRIB } = require("vgrib2");
//To implement, if required
const { createBrotliCompress } = require("zlib");

/**
 * @class HydroRTCServer
 * @description Server-side implementation for the HydroRTC system
 * Works as a connection host intermediary for client class
 */

class HydroRTCServer {
  /**
   * Sets all the required information for a server through a specific port.
   */
  constructor() {
    // server properties
    this.hostname = "";
    this.port = 0;
    // list of connected peers
    this.peers = [];
    // smart data sharing properties
    this.smartDataSharing = {
      dataPath: "",
      resolution: "",
      frequency: "",
      data: {},
    };

    // for sending smart data after configured interval
    this.smartDataInterval = null;
    // list of tasks, server has for the peers
    this.tasks = [];

    //Image data streaming namespaces
    //TODO: Generalize for the whole application
    this.dataStreaming = {
      dataPath: "",
      data: {}
    };

    //netCDF file namespaces
    this.netCDF = {
      dataPath: "",
      data: {}
    }

    //HDF5 files namespaces
    this.HDF5 = {
      dataPath: "",
      data: {}
    }

    //TIFF or geoTIFF namespaces
    this.tiff = {
      dataPath: "",
      data: {}
    }

    //Different datatypes locations
    this.dataTypeLocation = {
      dataPath: "",
    }

    //Set server and input/output variables
    this.server = null;
    this.io = null;
  }

  /**
   * @method prepareServer - Initializes the sever for the HydroRTC library. Sets the available 
   * @memberof HydroRTCServer
   * @param {String} hostname = The hostname or IP address for the server
   * @param {Number} port - Port number for the server. It looks into the environment to set the specific port based on the available 
   * @param {String} [homePage = 'index.html'] - location of the homPage the sever interacts with. Defaults to the available index.html, if exists.
   * @returns {VoidFunction}
   */
  prepareServer(hostname, port, homePage = "index.html") {
    this.hostname = hostname;
    this.port = process.env.PORT || port;
    const defaultHomePage = homePage.startsWith("/") ? homePage : `/${homePage}`;
    this.server = createServer(async (request, response) => {
      const uri = parse(request.url).pathname,
        filename = join(process.cwd(), uri),

        //var isWin = !!process.platform.match(/^win/);
        // specifiying default home page of the library client application
        // TODO: allow library client to specify name and location of homepage file
        filePath = statSync(filename).isDirectory()
          ? join(filename, defaultHomePage)
          : filename;

      await this.serveFile(response, filePath);
    });

    // initializing Server Socket.IO
    this.io = new Server(this.server, {
      //Allows for listening of keeping track of events within the server space
      cors: {
        origin: ["https://admin.socket.io"],
        credentials: true,
      },
    });
    instrument(this.io, {
      auth: false,
      mode: "development",
    });

    /**
     * Server-side event handlers
     * Any other events that are to added to the feature should be included in this space
     */

    // on receiving connection request from client
    this.io.on("connection", (socket) => {
      //Join listener
      socket.on("join", (peer) => this.joinServer(socket, peer));

      //Validating user listener
      socket.on("validate-username", (data) => this.validateUser(socket, data));

      //Data stream listener
      socket.on("stream-data", (data) => this.streamData(socket, data));

      //Obtain all the peer list 
      socket.on("peers-list", (peer) => this.getPeers(peer));

      //Obtain specific peer ID
      socket.on("peer-id", (peer) => {
        this.getPeerID(peer)
      })

      //Request the specified peer for connection, 1-1
      socket.on("request-peer", (data) => this.connectPeers(data));

      //Allow requests to do smart data connectivity
      socket.on("start-smart-data-sharing", (peer) =>
        this.smartDataShare(peer)
      );

      //Update requests on smart data management
      socket.on("update-smart-data-sharing", (peer) =>
        this.updateSmartDataShare(peer)
      );

      //Upload data to server, can be saved from the local storage or any other place
      socket.on("peer-to-server", (data) => this.uploadData(data));

      //Obtain the tasks per peer
      socket.on("get-task", (peer) => this.getTask(peer));

      //Obtain the task results back into the server, then broadcast either results or viewer
      socket.on("task-result", (peer) => this.taskResult(peer));

      //Disconnect a specific peer(s)
      socket.on("disconnect", () => {
        this.handleDisconnect(socket);
      });

      //Request a data type to have the correct handler, case study 1 and 2
      socket.on("data-request", (peer) => {
        this.dataType(peer);
      })

      //Return a netCDF reader towards a peer(s)
      socket.on("netcdf-reader", (peer) => {
        this.handlenetCDF(peer);
      })

      //Return a hdf5 reader towards a peer(s)
      socket.on("hdf5-reader", (peer) => {
        this.handleHDF5(peer)
      })

      //Return a TIFF(geoTIFF) reader towards a peer(s)
      socket.on("tiff-reader", (peer) => {
        this.handleTIFF(peer)
      })

      //Send name(s) and data type(s) of file(s) in a folder
      socket.on("datatype-reader", (peer) => {
        this.sendFileNames(peer)
      })
    });
  }

  /**
   * @method serveFile - Reads and serves a specified file to the client's response
   * @memberof HydroRTCServer
   * @param {Object{}} response - Response object to send data back to the client
   * @param {String} filename - Path of the file to be served
   * @returns {Promise<void>} Serves the HTML page
   */

  async serveFile(response, filename) {
    // if home page exists then read its content and send back to client
    try {
      const fileStats = await fsPromises.stat(filename);
      if (!fileStats.isFile()) {
        throw new Error(`Not a file: ${filename}`);
      }

      const fileContent = await fsPromises.readFile(filename, "binary");
      response.writeHead(200, { "Content-Type": "text/html" });
      //Serve other files in the HTML through static imports. This might need change because of security issues!
      response.writeHead(200, { "Access-Control-Allow-Origin": "*" })
      response.write(fileContent, "binary");
      response.end();
    } catch (error) {
      response.writeHead(404, {
        "Content-Type": "text/plain",
      });
      response.write(`404 Not Found: ${filename}\n`);
      response.end();
    }
  }

  /**
   * @method joinServer - Joins a peer to the existing server and gets broadcasted to the exisiting peer list.
   * @memberof HydroRTCServer
   * @param {Object{}} socket - Socket representing the peer's connection
   * @param {Object{}} peer - Information about the joining peer.
   * @returns {void} registers the peer on the server.
   */

  joinServer(socket, peer) {
    //UserID has the following properties:
    //clientName
    let { sessionID } = peer
    sessionID["socketId"] = socket.id;
    //This one doesnt make much sense
    sessionID["has-stream-data"] = false;

    // TODO: check for unique peer name

    this.peers = this.peers.filter(
      (existingPeer) => existingPeer.clientName !== sessionID.clientName
    );
    this.peers.push(sessionID);
    console.log("peer (%s) joined: ", sessionID.clientName);
    console.log("peer (%s) joined: ", sessionID.clientID);
  }

  /**
   * @method validateUser - validates that a user is already registered on the live server.
   * @memberof hydroRtcServer
   * @param {Object{}} socket - current socket used by the user
   * @param {Object{}} data - peer data available
   * @returns {EventEmitter}
   */

  validateUser(socket, data) {
    // checks whether username is unique or not
    let username = data.clientName;
    const isUsernameUnique = !this.userNameTaken(username)

    //Emit the message for validating the given username
    socket.emit("valid-username", {
      valid: isUsernameUnique,
    });

    //In case the user is already found in the server list
    if (!isUsernameUnique) {
      socket.disconnect();
    }
  }

  /**
   *
   * @param {*} socket
   * @param {*} peer
   */

  streamData(socket, data) {
    let { name, filePath } = data
    console.log(name, filePath)
    console.log("peer (%s) requested to stream data: ", name);

    // default chunk size is 65536
    // to change the chunk size updated highWaterMark property
    // https://nodejs.org/api/fs.html#fs_fs_createreadstream_path_options

    let streamDataPeer = this.getPeerwithStreamData();

    // if there is a peer with stream data
    if (streamDataPeer) {
      // sending the request to that peer to send data to requesting peer
      this.io.to(streamDataPeer.socketId).emit("connect-request", {
        requestor: name,
        request: "streamData",
        usecase: "decentralized",
      });
    } else {
      let readStream = createReadStream(filePath, {
        encoding: "utf8",
        highWaterMark: 16 * 1024,
      });

      let stgObj = this;

      readStream
        .on("data", function (chunk) {
          socket.emit("data-stream", {
            data: chunk,
            status: "incomplete",
            peer: null,
          });
        })
        .on("end", function () {
          socket.emit("data-stream", {
            data: "",
            status: "complete",
          });

          stgObj.updatePeerProperty(name, "has-stream-data", true);
        });
    }
  }

  /**
   *
   * @param {*} peer
   */

  getPeers(peer) {
    console.log("peer (%s) requested to get list of peers: ", peer.clientName);

    let list = [];

    this.peers.forEach((p) => {
      list.push(p.clientName);
      console.log(p.clientName)
    });

    // broadcasting peers list to all connected peers
    this.io.emit("peers", {
      peers: list,
      status: "complete",
    });
  }

  /**
   * 
   * @param {*} peer 
   * @param {*} socketId 
   */

  getPeerID(peer, socketId) {
    let { clientName } = peer

    console.log(`This is the peer value ${peer.clientName}`)

    let peerId = this.peers.find((p) => p.clientName === clientName)

    console.log(`This is the peer Id for the given peer: ${peerId.clientID}`)

    this.io.emit('peer-id-value', {
      user: peerId.clientName,
      id: peerId.clientID
    })
  }

  /**
   *
   * @param {*} data
   */

  connectPeers(data) {
    console.log(data)
    if (!data.recieverPeerName) {
      console.log('Peer %s is not found in the server.', data.recieverPeerName)
      return
    }
    console.log(
      "peer (%s) requested to connected with peer (%s): ",
      data.requestorName,
      data.recieverPeerName
    );
    let receiverPeer;
    // finding requested peer
    this.peers.forEach((p) => {
      if (p.clientName == data.recieverPeerName) {
        receiverPeer = p;
      }
    });

    // forwarding connection request to requested peer
    this.io.to(receiverPeer.socketId).emit("connect-request", {
      requestor: data.requestorName,
      request: data.request,
      usecase: "collaborative",
    });
  }

  /**
   *
   * @param {*} peer
   */

  smartDataShare(peer) {
    let { clientName, dataPath, resolution, frequency } = peer
    console.log("peer (%s) requested to start smart data sharing: ", clientName);

    this.smartDataSharing = {}

    this.smartDataSharing.dataPath = dataPath;
    this.smartDataSharing.resolution = resolution;
    this.smartDataSharing.frequency = frequency;

    // reading images from data path folder

    let resolutions = getDirectories(this.smartDataSharing.dataPath);

    //single path found in the given directory
    if (resolutions.length === 1) {
      let files = getFiles(resolutions[0]);
      let count = 0;
      //console.log(files);
      this.smartDataSharing.data[this.smartDataSharing.resolution] = files;
      this.smartDataInterval = this.getSmartDataIntervalCallback(peer);
      return;
    }

    resolutions.forEach((resolution) => {
      let currDir = this.smartDataSharing.dataPath + resolution + "/";
      let rows = getDirectories(currDir);
      this.smartDataSharing.data[resolution] = {};
      // will read first row for now
      let count = 0;
      rows.forEach((row) => {
        if (count < 1) {
          let filenames = getFiles(currDir + row + "/");
          this.smartDataSharing.data[resolution][row] = filenames;
        }
        count++;
      });
    });
    this.smartDataInterval = this.getSmartDataIntervalCallback(peer);
  }

  /**
   *
   * @param {*} peer
   */

  updateSmartDataShare(peer) {
    console.log(
      "peer (%s) requested to update smart data configuration: ",
      peer.name
    );

    this.smartDataSharing.resolution = peer.resolution;
    this.smartDataSharing.frequency = peer.frequency;

    // clearing old smart data interval and creating new one based on updated properties
    clearInterval(this.smartDataInterval);
    this.smartDataInterval = this.getSmartDataIntervalCallback(peer);
  }

  /**
   *
   * @param {*} peer
   */

  taskResult(peer) {
    let { name, task, result } = peer
    console.log(
      "peer (%s) submitted result for a task (%s): ",
      (name, task)
    );

    if (result[0].length === null || typeof result[0].length === undefined) {
      return error(`Peer was unable to submit result for task ${task}. Error in the results.`)
    }

    console.log("Result from task (%s) has been saved in the result space", peer.result);
  }

  /**
   *
   * @param {*} peerName
   * @param {*} property
   * @param {*} value
   * @returns
   */

  updatePeerProperty(peerName, property, value) {
    for (let i = 0; i < this.peers.length; i++) {
      if (this.peers[i].name == peerName) {
        this.peers[i][property] = value;
      }
    }
    return null;
  }

  /**
   *
   * @returns
   */

  getPeerwithStreamData() {
    // get most recent peer

    let totalPeers = this.peers.length;

    for (let i = totalPeers - 1; i >= 0; i--) {
      if (this.peers[i]["has-stream-data"]) {
        return this.peers[i];
      }
    }

    return null;
  }

  /**
   *
   * @param {*} peer
   * @returns
   */

  // callback to send smart data stream after configured interval
  // this does not necesarilly has to be 
  getSmartDataIntervalCallback(peer) {
    let count = 0;
    let data = this.smartDataSharing.data[this.smartDataSharing.resolution];

    const emitFile = () => {
      if (typeof data === 'undefined') {
        //console.log(data); 
        return
      }
      if (count < data.length) {
        let filename = data[count];
        let stgData = imageHandler(this.smartDataSharing.dataPath + filename);

        this.io.to(peer.socketId).emit("smart-data", {
          resolution: this.smartDataSharing.resolution,
          rowNo: count,
          filename: filename,
          data: stgData,
          usecase: "smart-data",
        });

        count++;

        if (count === data.length) {
          clearInterval(intervalId); // Stop the interval if all emissions have been sent
        }
      }
    };

    const intervalId = setInterval(emitFile, parseInt(this.smartDataSharing.frequency) * 1000);
    emitFile(); // Emit the first file immediately

    return intervalId;
  }

  /**
   *
   * @param {*} peer
   */

  getTask(peer) {
    console.log("peer (%s) requested for a task: ", peer.clientName);

    let peerNo = 0;

    // Sending tasks to requestor peer
    // Here, we can configure to send specific task to specific peer
    this.peers.forEach((p) => {
      if (peer.clientName == p.clientName) {
        let taskNo = peerNo % this.tasks.length;

        this.io.to(p.socketId).emit("task", {
          task: this.tasks[taskNo],
          usecase: "distributed-data-analysis-and-processing",
        });
      }
      peerNo += 1;
    });
  }

  /**
   *
   */

  runServer() {
    // TODO: check if server can run on given port and hostname or not
    this.server = this.server.listen(this.port, this.hostname, function () {
      let addr = this.address();
      console.log("Server listening at", addr.address + ":" + addr.port);
    });
  }

  /**
   *
   * @param {*} tasks
   */

  setTasks(tasks) {
    this.tasks = tasks;
  }

  /**
   *
   * @returns
   */

  getAddress() {
    return this.hostname + ":" + this.port;
  }

  /**
   *
   * @param {*} socket
   */
  handleDisconnect(socket) {
    const disconnectedPeer = this.getPeerBySocketId(socket.id);

    if (disconnectedPeer) {
      this.peers = this.peers.filter((peer) => peer.socketId !== socket.id);
      this.io.to(socket).emit("delete-db");
      console.log(`Peer disconnected: ${disconnectedPeer.clientName}`);
    }
  }

  /**
   *
   * @param {*} socketId
   * @returns
   */
  getPeerBySocketId(socketId) {
    return this.peers.find((peer) => peer.socketId === socketId);
  }

  /**
   * 
   * @param {*} peer 
   * @returns 
   */
  handlenetCDF(peer) {
    let { clientName, dataPath, socketId } = peer

    //console.log(`peer ${clientName} requested ${dataPath} file from server.`);

    this.netCDF = {}

    this.netCDF.dataPath = dataPath;

    // reading cdf files from current directory
    //only 1 single CDF file to be read by now. Potential to just like the image handler

    let resolutions = getDirectories(this.netCDF.dataPath);

    //single path found in the given directory
    if (resolutions.length === 1) {
      let files = getFiles(resolutions[0]);
      //console.log(files);
      //Single file stream now
      let filename = files[0];
      largeFileHandler(this.netCDF.dataPath + filename).then(data => {
        //This is where the data should be either streamed as it is or changed
        let reader = new NetCDFReader(data);
        let values = {
          dimensions: reader.dimensions,
          variables: reader.variables,
          attributes: reader.globalAttributes
        }
        this.io.to(socketId).emit("netcdf-data", {
          filename,
          data: values
        });
        return;
      });
    }
  }

  /**
   * 
   * @param {*} peer 
   */
  handleHDF5(peer) {
    //Workaround to run the async/await stuff on node outside a module
    (async () => {
      const hdf5wasm = await import('h5wasm');
      await hdf5wasm.ready;

      let { clientName, dataPath, socketId } = peer

      this.HDF5 = {}

      //console.log(`peer ${clientName} requested hdf5 file from server.`);

      this.HDF5.dataPath = dataPath;

      // reading HDF5 files from current directory
      //only 1 single HDF5 file to be read by now. Potential to just like the image handler

      let resolutions = getDirectories(this.HDF5.dataPath);

      //single path found in the given directory
      //if (resolutions.length === 1) {
      let files = getFiles(resolutions[0]);
      //console.log(files);
      //Single file stream now
      let filename = files[0];

      let reader = new hdf5wasm.File(this.HDF5.dataPath + filename, 'r');

      let f = reader.get(reader.keys()[0]).keys()

      //TODO: modify this handler for multiple types of variables
      let d = reader.get(`${reader.keys()[0]}/precipitationCal`)

      //console.log(d)

      let data = {
        metadata: d.metadata,
        dataType: d.type,
        shape: d.shape,
        values: d.to_array()
      }

      this.io.to(socketId).emit("hdf5-data", {
        filename,
        data
      });
      return;
      //}
    })()
  }

  /**
 * Handler for request of TIFF/GeoTIFF images
 * NEEDS TO BE FINISHED
 */
  handleTIFF(peer) {
    (async () => {
      const GeoTiff = await import('geotiff');
      const { fromUrl, fromUrls, fromArrayBuffer, fromBlob } = GeoTiff;

      let { clientName, dataPath, socketId } = peer

      this.tiff = {}

      //console.log(`peer ${clientName} requested tiff file from server.`);

      this.tiff.dataPath = dataPath;

      let resolutions = getDirectories(this.tiff.dataPath);

      let files = getFiles(resolutions[0]);
      //console.log(files);
      //Single file stream now
      let filename = files[0];

      //console.log(this.tiff.dataPath + filename)

      const res = await largeFileHandler(this.tiff.dataPath + filename)
      const arrayBuffer = res.buffer.slice(res.byteOffset, res.byteOffset + res.byteLength);
      //const arrayBuffer = await res.arrayBuffer();
      const TIFF = await fromArrayBuffer(arrayBuffer);
      const image = await TIFF.getImage();

      const width = image.getWidth();
      const height = image.getHeight();
      const tileWidth = image.getTileWidth();
      const tileHeight = image.getTileHeight();
      const samplesPerPixel = image.getSamplesPerPixel();

      const origin = image.getOrigin();
      const resolution = image.getResolution();
      const bbox = image.getBoundingBox();

      let data = {
        sizes: { width, height, tileWidth, tileHeight },
        resolution: { samplesPerPixel, origin, resolution, bbox },
      }

      this.io.to(socketId).emit("tiff-data", {
        filename,
        data
      });
      return;
    })()
  }

  /**
   * 
   * @param {*} peer 
   * @returns 
   */
  sendFileNames(peer) {
    let { clientName, dataPath, socketId } = peer

    this.dataTypeLocation = {}

    //console.log(`peer ${clientName} requested files file from server with extension ${dataPath}.`);

    this.dataTypeLocation.dataPath = dataPath;

    let resolutions = getDirectories(`./data/${this.dataTypeLocation.dataPath}/`);

    let files = getFiles(resolutions[0]);

    let data = {
      files
    }

    this.io.to(socketId).emit("datatype-files", {
      data
    });
    return;
  }

  /**
   * 
   * @param {*} username 
   * @returns 
   */
  userNameTaken(username) {
    return this.peers.some((peer) => peer.clientName === username);
  }
}

// --- utility functions ---

/**
 * 
 * @param {*} source 
 * @returns 
 */
function getDirectories(source) {
  try {
    const dirents = readdirSync(source, {
      withFileTypes: true,
      recursive: true,
    });
    const directories = dirents
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);
    if (directories.length === 0) {
      return [source];
    }
    return directories;
  } catch (error) {
    console.error("Error reading directories:", error);
    throw error; // Propagate the error
  }
}

/**
 * 
 * @param {*} source 
 * @returns 
 */
function getFiles(source) {
  try {
    const dirents = readdirSync(source, { withFileTypes: true });
    const files = dirents
      .filter((dirent) => dirent.isFile())
      .map((dirent) => dirent.name);
    return files;
  } catch (error) {
    console.error("Error reading files:", error);
    throw error; // Propagate the error
  }
}

/**
 * Function for handling different types of image files.
 * Support t: jpg, tiff, tif, jpeg, png
 * @param {*} file 
 * @returns 
 */
function imageHandler(file) {

  let fileStream = readFileSync(file, { encoding: 'base64' });
  return fileStream
  //
}

/**
 * Function for handling large files for streaming
 * Returns stream of bytes that needs to be handled
 * By the implemented file handler
 * @param {String} file 
 * @returns {Promise} memory saved and stored
 */
function largeFileHandler(file) {
  //
  return new Promise((resolve, reject) => {
    const CHUNK_SIZE = 10000000;
    const data = [];

    //On the streamchunk 
    var read = createReadStream(file, { highWaterMark: CHUNK_SIZE });
    read.on('data', (chunk) => {
      data.push(chunk)
    })

    //On finished stream
    //Still need to change the way this handler is supposed to work
    read.on('end', () => {
      //console.log(data.length)
      //Buffer.concat(data.slice(window))
      resolve(Buffer.concat(data))
    })

    //On an error on the request
    read.on('error', (error) => {
      reject(error)
    })
  })
}

/**
 * TO IMPLEMENT
 * @param {*} data 
 */
function uploadData(data) {

}

this.server = new HydroRTCServer();
