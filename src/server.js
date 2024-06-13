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
  read,
} = require("fs");
const { Server } = require("socket.io");
const { instrument } = require("@socket.io/admin-ui");
const { NetCDFReader } = require("netcdfjs");

const grib2 = require('grib2-simple/index')

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
   *  * @description Initializes the server for the HydroRTC library. Sets the available event emitters and their corresponding handlers:
 * - `'request'`: Emitted when a client makes a request to the server.
 * - `'connection'`: Emitted when a new client connects to the server.
 * - `'disconnect'`: Emitted when a client disconnects from the server.
 * - `'error'`: Emitted when an error occurs on the server.
 * - `'message'`: Emitted when the server receives a message from a client.
 * - `'data'`: Emitted when the server receives data from a client.
 * - `'close'`: Emitted when the server is closed.
 * - `'upgrade'`: Emitted when the server is upgraded.
 * - `'listening'`: Emitted when the server starts listening for connections.
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
   * @memberof HydroRTCServer
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
   * @method streamData
   * @memberof HydroRTCServer
   * @param {Object{}} socket - The current socket used by the user.
   * @param {Object{}} data - The peer data available.
   * @emits 'data-stream'
   * @description Streams the requested data to the user's socket.
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
   * @method getPeers
   * @memberof HydroRTCServer
   * @param {Object{}} peer - The current peer requesting the list of peers.
   * @emits 'peers'
   * @description Retrieves and broadcasts the list of connected peers.
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
   * Retrieves the unique identifier (clientID) for a given peer, based on the clientName property.
   * @method getPeerID
   * @memberof HydroRTCServer
   * @param {Object} peer - The peer object containing the clientName property.
   * @param {string} socketId - The socket ID of the peer.
   * @emits 'peer-id-value'
   * @description Emits an event with the peer's clientName and clientID.
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
   * Connects two peers by forwarding a connection request to the receiver peer.
   * @method connectPeers
   * @memberof HydroRTCServer
   * @param {Object} data - An object containing information about the connection request.
   * @param {string} data.requestorName - The name of the peer requesting the connection.
   * @param {string} data.recieverPeerName - The name of the peer to receive the connection request.
   * @param {string} data.request - The type of connection request (e.g., "collaborative").
   * @emits 'connect-request'
   * @description Forwards the connection request to the receiver peer, if the receiver peer is found in the list of connected peers.
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
   * Handles the process of smart data sharing between peers.
   * @method smartDataShare
   * @memberof HydroRTCServer
   * @param {Object} peer - An object containing information about the peer requesting smart data sharing.
   * @param {string} peer.clientName - The name of the peer.
   * @param {string} peer.dataPath - The path to the directory containing the data to be shared.
   * @param {string} peer.resolution - The resolution of the data to be shared.
   * @param {number} peer.frequency - The frequency at which the data should be shared.
   * @description Reads the data from the specified directory, organizes it by resolution and row, and sets up an interval to periodically share the data with the peer.
   */
  smartDataShare(peer) {
    let { clientName, dataPath, resolution, frequency } = peer
    console.log("peer (%s) requested to start smart data sharing: ", clientName);

    this.smartDataSharing = {};

    if (!this.smartDataSharing.data) {
      this.smartDataSharing.data = {};
  }

    this.smartDataSharing.dataPath = dataPath;
    this.smartDataSharing.resolution = resolution;
    this.smartDataSharing.frequency = frequency;

    // reading images from data path folder

    let resolutions = getDirectories(this.smartDataSharing.dataPath);

    console.log(resolutions)

    //single path found in the given directory
    if (resolutions.length === 1) {
      let files = getFiles(resolutions[0]);
      let count = 0;
      console.log(files);
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
   * Updates the smart data sharing configuration for a peer.
   * @method updateSmartDataShare
   * @memberof HydroRTCServer
   * @param {Object} peer - An object containing information about the peer requesting the smart data sharing update.
   * @param {string} peer.name - The name of the peer.
   * @param {string} peer.resolution - The new resolution of the data to be shared.
   * @param {number} peer.frequency - The new frequency at which the data should be shared.
   * @description Logs the peer's request to update the smart data configuration, updates the resolution and frequency properties, clears the old smart data interval, and creates a new interval based on the updated properties.
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
   * Processes the result of a task submitted by a peer.
   * @method taskResult
   * @memberof HydroRTCServer
   * @param {Object} peer - An object containing information about the peer submitting the task result.
   * @param {string} peer.name - The name of the peer.
   * @param {string} peer.task - The name of the task.
   * @param {Array} peer.result - The result of the task.
   * @description Logs the peer's submission of the task result, checks if the result is valid, and logs a message indicating that the result has been saved.
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
   * Updates a property of a peer in the peers array.
   * @method updatePeerProperty
   * @memberof HydroRTCServer
   * @param {string} peerName - The name of the peer whose property needs to be updated.
   * @param {string} property - The name of the property to be updated.
   * @param {any} value - The new value for the property.
   * @description Iterates through the peers array, finds the peer with the given name, and updates the specified property with the provided value.
   * @returns {null} - Returns `null` if the property was successfully updated.
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
   * Retrieves the most recent peer that has stream data.
   * @method getPeerwithStreamData
   * @memberof HydroRTCServer
   * @description Iterates through the peers array in reverse order (from most recent to oldest) and returns the first peer that has the "has-stream-data" property set to true. If no such peer is found, it returns null.
   * @returns {Object|null} - Returns the most recent peer with stream data, or null if no such peer is found.
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
   * Generates a callback function that emits smart data to a specific peer at a regular interval.
   * @method getSmartDataIntervalCallback
   * @memberof HydroRTCServer
   * @param {Object} peer - The peer object to which the smart data will be emitted.
   * @returns {number} - The ID of the interval that was set up to emit the smart data.
   * @description
   * This method sets up an interval that emits smart data to the specified peer at a regular interval. It retrieves the smart data from the `this.smartDataSharing.data[this.smartDataSharing.resolution]` array, and for each file in the array, it:
   * 1. Retrieves the file data using the `imageHandler` function.
   * 2. Emits the file data to the peer using the "smart-data" event, along with the resolution, row number, filename, and usecase.
   * 3. Increments the count of emitted files.
   * 
   * If all files have been emitted, the interval is cleared.
   * 
   * The method returns the ID of the interval that was set up, which can be used to clear the interval later if needed.
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
        //Right now set up for images, but will be updated to handle any kind of file
        let stgData = fileEnconder(this.smartDataSharing.dataPath + filename);

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
   * Handles the request for a task from a peer and assigns a task to the peer.
   * @method getTask
   * @memberof HydroRTCServer
   * @param {Object} peer - The peer object that requested the task.
   * @description
   * This method is called when a peer requests a task. It logs the request and then iterates through the `this.peers` array to find the requesting peer. Once the requesting peer is found, a task is assigned to the peer by emitting the "task" event with the task data.
   * 
   * The task is selected by taking the `peerNo` modulo the length of the `this.tasks` array, which ensures that the tasks are distributed evenly among the peers.
   * 
   * The task data is sent to the peer using the "task" event, along with the "usecase" property set to "distributed-data-analysis-and-processing".
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
   * Starts the server and listens for incoming connections.
   * @method runServer
   * @memberof HydroRTCServer
   * @description
   * This method is responsible for starting the server and listening for incoming connections. It first checks if the server can run on the given port and hostname, and then starts the server and logs the address it's listening on.
   * 
   * The server is started using the `listen` method of the `this.server` object, which is likely an instance of a web server like Express or Node.js's built-in HTTP server. The `listen` method takes the port and hostname as arguments, and a callback function that is called when the server starts listening.
   * 
   * Inside the callback function, the `address` method of the server is called to get the address the server is listening on, and this information is logged to the console.
   */
  runServer() {
    // TODO: check if server can run on given port and hostname or not
    this.server = this.server.listen(this.port, this.hostname, function () {
      let addr = this.address();
      console.log("Server listening at", addr.address + ":" + addr.port);
    });
  }

  /**
   * @method setTasks
   * @param {Object} tasks
   */

  setTasks(tasks) {
    this.tasks = tasks;
  }

  /**
   * @method getAddress
   * @returns {String} - The address of a given host and port
   */

  getAddress() {
    return this.hostname + ":" + this.port;
  }

  /**
   * Handles the disconnection of a peer from the WebSocket connection.
   * @method handleDisconnect
   * @memberof HydroRTCServer
   * @param {Object} socket - The socket object representing the disconnected peer.
   * @returns {void}
   * @description
   * Removes the disconnected peer from the `this.peers` array, emits a "delete-db" event to the peer's socket, and logs a message to the console.
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
   * Retrieves a peer object by its socket ID.
   * @method getPeerBySocketId
   * @memberof HydroRTCServer
   * @param {string} socketId - The socket ID of the peer to retrieve.
   * @returns {Object|undefined} - The peer object if found, or undefined if not found.
   * @description
   * This method searches the `this.peers` array for a peer object with the matching `socketId` and returns it. If no matching peer is found, it returns `undefined`.
   */
  getPeerBySocketId(socketId) {
    return this.peers.find((peer) => peer.socketId === socketId);
  }

  /**
   * Handles the processing of a NetCDF file request from a peer.
   * @method handleNetCDF
   * @memberof HydroRTCServer
   * @param {Object} peer - The peer object containing the client's information.
   * @returns {void}
   * @description
   * This method processes a NetCDF file request from a client. It reads the file, extracts the data, and sends it back to the client.
   * @example
   * const peer = {
   *   clientName: 'myClient',
   *   dataPath: '/path/to/netcdf/file.nc',
   *   socketId: 'abc123'
   * };
   * this.handleNetCDF(peer);
   */
  async handlenetCDF(peer) {
    let { clientName, dataPath = null, socketId, fileBuffer = null } = peer

    let reader, filename, data;

    if (fileBuffer) {
      reader = new NetCDFReader(fileBuffer);
      this.netCDF.data = {
        dimensions: reader.dimensions,
        variables: reader.variables,
        attributes: reader.globalAttributes
      }
    } else {

    //console.log(`peer ${clientName} requested ${dataPath} file from server.`);
    this.netCDF.dataPath = dataPath;

    // reading cdf files from current directory
    //only 1 single CDF file to be read by now. Potential to just like the image handler

    let resolutions = getDirectories(this.netCDF.dataPath);

    let files = getFiles(resolutions[0]);
    //console.log(files);
    //Single file stream now
    filename = files[0];
    data = await largeFileHandler(this.netCDF.dataPath + filename)
      //This is where the data should be either streamed as it is or changed
    reader = new NetCDFReader(data);
    this.netCDF.data = {
      dimensions: reader.dimensions,
      variables: reader.variables,
      attributes: reader.globalAttributes
    }
  }
      this.io.to(socketId).emit("netcdf-data", {
        filename,
        data: this.netCDF.data
      });

      this.netCDF = {}
      return;
  }

  /**
   * Handles the processing of an HDF5 file request from a peer.
   * @method handleHDF5
   * @memberof HydroRTCServer
   * @param {Object} peer - The peer object containing the client's information.
   * @returns {void}
   * @description
   * This method processes an HDF5 file request from a client. It reads the file, extracts the data, and sends it back to the client.
   * @example
   * const peer = {
   *   clientName: 'myClient',
   *   dataPath: '/path/to/hdf5/file.h5',
   *   socketId: 'abc123'
   * };
   * this.handleHDF5(peer);
   */
  handleHDF5(peer) {
    //Workaround to run the async/await stuff on node outside a module
    (async () => {
      const hdf5wasm = await import('h5wasm');
      await hdf5wasm.ready;

      let { dataPath = null, socketId, fileBuffer = null } = peer

      let reader, filename;

      //console.log(`peer ${clientName} requested hdf5 file from server.`);

      if (fileBuffer) {
        reader = new hdf5wasm.File(fileBuffer, 'r')
      } else {
      this.HDF5.dataPath = dataPath;

      // reading HDF5 files from current directory
      //only 1 single HDF5 file to be read by now. Potential to just like the image handler

      let resolutions = getDirectories(this.HDF5.dataPath);

      //single path found in the given directory
      //if (resolutions.length === 1) {
      let files = getFiles(resolutions[0]);
      //console.log(files);
      //Single file stream now
      filename = files[0];

      reader = new hdf5wasm.File(this.HDF5.dataPath + filename, 'r');

    }

      //let f = reader.get(reader.keys()[0]).keys()
      let variables = reader.get(reader.keys()[0]).keys()

      console.log(variables)

      //TODO: modify this handler for multiple types of variables

      this.HDF5.data = {}
      for (let i = 0; i < variables.length; i++) {
        let d = reader.get(`${reader.keys()[0]}/${variables[i]}`)

        let values = d.to_array()
        let subset = values.map(subarr => Array.isArray(subarr) ? subarr.slice(0, 10) : subarr)
        //console.log(values.map(subarr => Array.isArray(subarr) ? subarr.slice(0, 10) : subarr))

        this.HDF5.data[`${variables[i]}`] = {
          metadata: d.metadata ? d.metadata : undefined,
          dataType: d.type ? d.type: undefined,
          shape: d.shape ? d.shape : undefined,
          values: subset
        }  
      }

      this.io.to(socketId).emit("hdf5-data", {
        filename,
        data: this.HDF5.data
      });
      this.HDF5 = {}
      return;
      //}
    })()
  }

  //STILL MISSING
  async handleGrib(peer) {
    let { clientName, dataPath = null, socketId, fileBuffer = null } = peer

    //console.log(`peer ${clientName} requested tiff file from server.`);

    this.gribb.dataPath = dataPath;

    let resolutions = getDirectories(this.tiff.dataPath);

    let files = getFiles(resolutions[0]);
    //console.log(files);
    //Single file stream now
    let filename = files[0];

    const res = await largeFileHandler(this.tiff.dataPath + filename)

  }

  /**
   * Handles the processing of a TIFF file request from a peer.
   * @method handleTIFF
   * @memberof HydroRTCServer
   * @param {Object} peer - The peer object containing the client's information.
   * @returns {void}
   * @description
   * This method processes a TIFF file request from a client. It reads the file, extracts the data, and sends it back to the client.
   * @example
   * const peer = {
   *   clientName: 'myClient',
   *   dataPath: '/path/to/tiff/file.tiff',
   *   socketId: 'abc123'
   * };
   * this.handleTIFF(peer);
   */
  handleTIFF(peer) {
    (async () => {
      const GeoTiff = await import('geotiff');
      const { fromUrl, fromUrls, fromArrayBuffer, fromBlob } = GeoTiff;

      let { clientName, dataPath = null, socketId, fileBuffer = null } = peer

      //console.log(`peer ${clientName} requested tiff file from server.`);

      let filename, arrayBuffer, res;
    

      if (fileBuffer) {
        arrayBuffer = fileBuffer
      } else {
        this.tiff.dataPath = dataPath;

        
      let resolutions = getDirectories(this.tiff.dataPath);

      let files = getFiles(resolutions[0]);
      //console.log(files);
      //Single file stream now
      filename = files[0];

      //console.log(this.tiff.dataPath + filename)

      const res = await largeFileHandler(this.tiff.dataPath + filename)

      arrayBuffer = res.buffer.slice(res.byteOffset, res.byteOffset + res.byteLength);
      }

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

      this.tiff.data = {
        sizes: { width, height, tileWidth, tileHeight },
        resolution: { samplesPerPixel, origin, resolution, bbox },
      }

      this.io.to(socketId).emit("tiff-data", {
        filename,
        data: this.tiff.data
      });
      this.tiff = {}
      return;
    })()
  }

  /**
   * Sends the list of file names available for a given data type to the client.
   * @method sendFileNames
   * @memberof HydroRTCServer
   * @param {Object} peer - The peer object containing the client's information.
   * @returns {void}
   * @description
   * This method retrieves the list of file names for a given data type and sends it to the client.
   * @example
   * const peer = {
   *   clientName: 'myClient',
   *   dataPath: 'tiff',
   *   socketId: 'abc123'
   * };
   * this.sendFileNames(peer);
   */
  sendFileNames(peer) {
    try {
      const { clientName, dataPath, socketId } = peer;
      const directories = getDirectories(`./data/${dataPath}/`);
      const files = getFiles(directories[0]);

      const data = { files };
      io.to(socketId).emit("datatype-files", { data });
    } catch (error) {
      console.error("Error sending file names:", error);
      // Handle or propagate the error as needed
    }
  }

  /**
   * Checks if a given username is already taken by another client.
   * @method userNameTaken
   * @memberof HydroRTCServer
   * @param {string} username - The username to check.
   * @returns {boolean} - True if the username is already taken, false otherwise.
   * @description
   * This method checks the list of connected peers to see if the given username is already in use.
     */
  userNameTaken(username) {
    return this.peers.some((peer) => peer.clientName === username);
  }
}

// --- utility functions ---

/**
 * Retrieves the list of directories in a given path.
 * @function getDirectories
 * @param {string} source - The path to the directory.
 * @memberof HydroRTCServer
 * @returns {string[]} - An array of directory names.
 * @description
 * This function uses the `readdirSync` method from the `fs` module to read the contents of the directory at the given path.
 * It then filters the results to only include directories and maps the directory names to an array.
 * If no directories are found, the function returns an array containing the original path.
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
 * Retrieves the list of files in a given path.
 * @function getFiles
 * @param {string} source - The path to the directory.
 * @memberof HydroRTCServer
 * @returns {string[]} - An array of file names.
 * @description
 * This function uses the `readdirSync` method from the `fs` module to read the contents of the directory at the given path.
 * It then filters the results to only include files and maps the file names to an array.
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
 * Reads the contents of an image file and returns it as a base64-encoded string.
 * @function imageHandler
 * @memberof HydroRTCServer
 * @param {string} file - The path to the image file.
 * @returns {string} - The base64-encoded contents of the image file.
 * @description
 * This function uses the `readFileSync` method from the `fs` module to read the contents of the image file at the given path.
 * It then encodes the contents as a base64 string and returns it.
 */
function fileEnconder(file, enconding = 'base64') {

  let fileStream = readFileSync(file, 
    { encoding: enconding }
  );
  return fileStream
  //
}

/**
 * Reads the contents of a large file and returns it as a Buffer.
 * @function largeFileHandler
 * @memberof HydroRTCServer
 * @param {string} file - The path to the large file.
 * @returns {Promise<Buffer>} - A Promise that resolves to a Buffer containing the contents of the file.
 * @description
 * This function uses the `createReadStream` method from the `fs` module to read the contents of the file at the given path in chunks.
 * It then concatenates the chunks into a single Buffer and returns it as a Promise.
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

function uploadData(data) {

}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HydroRTCServer;
} else if (typeof window !== 'undefined') {
  window.HydroRTC = HydroRTCServer;
}
