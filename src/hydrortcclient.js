// this file exports global objects for browser/client
const { configuration } = require("./configuration.js");
const { io } = require("socket.io-client");
const { EventEmitter } = require("events");
const { Peer } = require("peerjs");

// HydroRTCClient object
class HydroRTCClient {
  /**
   * Constructor class for the HydroRTC system
   * @param {*} clientName 
   * @returns 
   */
  //Initializer of required variables and event emitters
  constructor(clientName) {
    // list of usecases that can be used by client
    this.usecases = [
      "stream-data",
      "smart-data-transmission",
      "distributed-data-processing",
      "decentralized-data-distribution",
      "collaborative-data-exchange",
    ];

    // datatypes that can be shared and received by the client. This will be expanded
    //TODO: Handlers for different data types need to be tested
    this.dataTypes = ["csv", "xml", "json", "js", "png", "tab", "tiff", "ts", "jpeg", "jpg", "netcdf3x", "hdf5"];

    this.streamData = null;

    //Keeping track of throughput and datasize for a particular file
    this.dataStreamState = {
      start: null,
      end: null,
      size: 0
    }

    // TODO: ensure server is run before client
    // init
    this.configuration = configuration;
    // Defining Event Handlers for sending to client
    //TODO: need to modify some of this emitters
    this.objectCreationEvent = new EventEmitter();
    this.streamEventHandler = new EventEmitter();
    this.peersEventHandler = new EventEmitter();
    this.connectEventHandler = new EventEmitter();
    this.dataExchangeEventHandler = new EventEmitter();
    this.smartDataEventHandler = new EventEmitter();
    this.taskDataEventHandler = new EventEmitter();
    this.netCDFEventHandler = new EventEmitter();
    this.gribEventHandler = new EventEmitter();
    this.hdf5EventHandler = new EventEmitter();
    this.tiffEventHandler = new EventEmitter();
    this.dataTypesEventHandler = new EventEmitter();
    this.fileInputEventHandler = new EventEmitter();

    // initializing client socket
    this.socket = io();

    // trigger all the event handlers so they are ready upon initialization
    this.socketEventHandlers();
    // peer connection
    this.peerConn = null;
    // client's own connection
    this.myConn = null;


    //Define the user ID and name to be sent to server
    //Keeping track of all the values
    this.sessionID = { clientName }

    // upon object creation, send validate username event to server
    this.socket.emit("validate-username", {
      clientName: this.sessionID.clientName
    });

    // this object will hold stream data once received
    //NEEDS MODIFICATION, CANNOT JUST BE STREAMFLOW DATA
    this.lastProcessedFile = null;

    this.dbName = `HydroRTC_DB_${clientName}`
    this.createDB(this.dbName)

    // event handler to send object creation status to client
    return this.objectCreationEvent;
  }

  /**
   * 
   * @param {*} clientName 
   */
  createDB(clientName) {

    const request = indexedDB.open(clientName, 1)

    request.onupgradeneeded = (ev) => {
      const db = ev.target.result;

      if (!db.objectStoreNames.contains('data')) {
        db.createObjectStore('data', {
          keyPath: 'dataID'
        })
      }
    };

    request.onsuccess = (ev) => {
      console.log(`IndexedDB ${clientName} opened successfully.`);
      this.db = ev.target.result;
    }

    request.onerror = (ev) => {
      console.error(`Error opening and creating IndexedDB ${clientName}: ${ev.target.error}`)
    }
  }

  /**
   * 
   * @param {*} data 
   * @param {*} storeName 
   * @returns 
   */

  addDataToDB(data, storeName = 'data') {
    if (!this.db) {
      console.err('IndexedDB has not been initialized.');
      return;
    }

    const transaction = this.db.transaction([storeName], 'readwrite');
    const objectStore = transaction.objectStore(storeName);

    if (!this.lastProcessedFile) {

    //To change in the future for a specific identifier, either with task or keep data, or a combination
    //Serialize in order to keep tasks
    this.lastProcessedFile = new Date().getTime();
  }

    if (data.binaryData instanceof ArrayBuffer) {
      try {
        data.binaryData = new Blob([data.binaryData], {
          type: 'application/octet-binary'
        })
      } catch (err) {
        console.log(`There was an error saving a binary file: ${err}`)
      }
    }

    const request = objectStore.add(data);

    request.onsuccess = () => {
      console.log(`Data was correctly added to IndexedDB: ${data.dataID}`)
    }

    request.onerror = (ev) => {
      console.error(`Error adding data to IndexedDB: ${ev.target.error}`)
    }
  }

  /**
   * 
   * @param {*} storeName 
   * @returns 
   */

  getDataFromDB(storeName = 'data') {
    return new Promise((reject, resolve) => {
      if (!this.db) {
        reject('IndexedDB was not initialized.');
        return
      }
      const transaction = this.db.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName)
      const request = objectStore.getAll();

      request.onsuccess = (ev) => {
        const data = ev.target.result;

        //Assuming data is being saved as a buffer
        data.forEach(item => {
          if (item.binaryData instanceof Blob) {
            try {
              item.buffer.ArrayBuffer().then(buffer => {
                item.buffer = buffer;
              })
            } catch (err) {
              reject(`There was an error with the requested binary file: ${err}.`)
            }
          }
        })

        resolve(data);
      };

      request.onerror = (ev) => {
        reject(`Error getting data from IndexedDB: ${ev.target.error}`)
      };
    })
  }

  /**
   * 
   * @param {*} itemID 
   * @param {*} storeName 
   * @returns 
   */
  deleteDataFromDB(itemID, storeName = 'data') {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.log('IndexedDB has not been initialized.')
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.deleteDB(itemID);

      request.onsuccess = () => {
        console.log(`Item with ID ${itemID} was deleted from the database named ${storeName}`);
        resolve()
      }

      request.onerror = (ev) => {
        reject(`There was an eror with deleting ${itemID} from database ${storeName}:/n ${ev.target.error}`)
      }
    })
  }

  /**
   * 
   * @returns 
   */
  async deleteDB() {
    if (!this.dbName) {
      throw new Error('IndexedDB database name is not specified.')
    }

    if (this.db) {
      this.db.close();
    }

    return new Promise((reject, resolve) => {
      const deleteRequest = indexedDB.deleteDatabase(this.dbName);

      deleteRequest.onsuccess = () => {
        console.log(`IndexedDB database "${this.dbName}" deleted successfully.`);
        resolve();

        deleteRequest.onerror = (ev) => {
          reject(`Error deleting IndexedDB database: ${ev.target.error}`)
        }
      }
    })

  }

  /**
   * 
   */
  async logout() {
    try {
      await this.deleteDB();
      console.log('User database deleted successfully.');
    } catch (error) {
      console.error('Error during db deletion: ', error)
    }
  }

  /**
   * Data driven event handlers 
   */
  socketEventHandlers() {
    this.socket.on("valid-username", async (data) => {
      // if username is valid according to server
      if (data.valid) {
        //this. initialPeerConnect()
        this.initPeerJSConn()
      } else {
        // otherwise, disconnect from server
        this.socket.disconnect();
        await this.logout()
        // in case username is either invalid or already exists
        this.objectCreationEvent.emit("connect", {
          connected: false,
          message: "Username is already taken",
          obj: null,
        });
      }
    });

    this.socket.on("connect", () => {
      console.log(
        "Client (%s) Socket Connected with server: ",
        this.sessionID.clientName
      );
    });

    // on receiving data stream from server
    this.socket.on("data-stream", (message) => {
      this.streamData += message.data;
      // sending stream data back to client
      this.streamEventHandler.emit("data", {
        data: message.data,
        status: message.status,
      });
    });

    // on receiving peers list
    this.socket.on("peers", (message) => {
      let otherPeers = [];
      // collecting all peers except client
      message.peers.forEach((peer) => {
        if (peer.clientName != this.sessionID.clientName) {
          otherPeers.push(peer);
        }
      });

      // sending peers list back to client
      this.peersEventHandler.emit("data", {
        // TODO: exclude this client from peers list
        data: otherPeers,
        status: message.status,
      });
    });

    // on receiving smart data stream
    this.socket.on("smart-data", (message) => {
      // sending stream data back to client
      this.smartDataEventHandler.emit("data", {
        resolution: message.resolution,
        rowNo: message.rowNo,
        filename: message.filename,
        data: message.data,
      });
    });

    //TODO: Clients can read the NetCDF file from sever. Client implementation should also be added
    this.socket.on("netcdf-data", ({ data, filename }) => {
      this.netCDFEventHandler.emit("data", {
        data,
        filename
      })
    })

    this.socket.on("hdf5-data", ({ data, filename }) => {
      this.hdf5EventHandler.emit("data", {
        data,
        filename
      })
    })

    this.socket.on("tiff-data", ({ data, filename }) => {
      //Testing
      this.socket.emit("tiff-data", console.log('data'))
      this.tiffEventHandler.emit("data", {
        data,
        filename
      })
    })

    //Modify the request based on the type of information request from the user
    this.socket.on("datatype-files", ({ data }) => {
      this.dataTypesEventHandler.emit("data", {
        data
      })
    })

    // upon successful completion of connection request with peer
    this.socket.on("connect-request", (message) => {
      if (message.usecase == "decentralized") {
        // if usecase is decentralized (this peer needs to send data to requestor peer)
        // then send data to peer that requested for data stream
        this.connectWithPeer(message.requestor).then((response) => {
          if (response.status == "connected") {
            this.sendStreamDataToPeer(message.usecase);
          }
        });
      } else {
        // otherwise, get data from server (for peer that requested data)
        this.connectEventHandler.emit("data", {
          requestor: message.requestor,
          request: message.request,
        });
      }
    });

    // on receiving task from server
    this.socket.on("task", (message) => {
      // sending task back to client
      this.taskDataEventHandler.emit("data", {
        task: message.task,
      });
    });

    //User uploading data as binary files that are to be stored in the server or on the local storage of the user
    //using information provided by the user
    this.socket.on("data-upload", (message) => {

    });

    this.socket.on("delete-db", async () => {
      await this.deleteDB()
      console.log(`Database ${this.dbName} was deleted.`)
    })
  }

  /**
   * Stream data request initiator
   * @returns {Function} - Event emitter for the stream data requestor
   */
  streamDataRequest(filePath) {
    console.log(filePath)
    // client can hold one stream data at time.
    // new stream data will update the old request.
    this.streamData = "";

    if (!this.configuration.usecases.includes("stream-data")) {
      let socketId = this.socket.id;
      this.socket.emit("stream-data", {
        clientName: this.sessionID.clientName,
        socketId,
        filePath
      });

      return this.streamEventHandler;
    } else {
      console.log(
        "Client (%s) is not eligible to use stream-data usecase.",
        this.sessionID.clientName
      );
      return null;
    }
  }

  /**
   * Peer handlers
   * @returns {Function} - Event emitter for the peer listener
   */
  getPeers() {
    let socketId = this.socket.id;

    // emits event for server to get peers list
    this.socket.emit("peers-list", {
      clientName: this.sessionID.clientName,
      socketId: socketId,
    });

    return this.peersEventHandler;
  }

  /**
   * 
   * @param {*} remotePeerId 
   * @returns 
   */
  getPeersID(remotePeerId) {
    //Obtain the peer ID if found in the server
    this.socket.emit("peer-id", {
      clientName: remotePeerId,
    });
    return this.peersEventHandler
  }

  /**
   *
   * @returns {Function} - Event hanlder for the connection request
   */
  // makes the client eligible to receive requests from other peer
  // returns event handler to send information of peer who initiated the request
  listenRequests() {
    return this.connectEventHandler;
  }

  /**
   * user can enable / disable usecases
   * and types of data they can send / receive
   * @param {*} usecases
   * @param {*} receiveDataTypes
   * @param {*} sendDataTypes
   */
  setConfiguration(usecases, receiveDataTypes, sendDataTypes) {
    // TODO: validate all inputs
    this.configuration.setUsecases(usecases);
    this.configuration.setReceiveDataTypes(receiveDataTypes);
    this.configuration.setSendDataTypes(sendDataTypes);
  }

  /**
   * 
   * @returns 
   */
  getConfiguration = function () {
    return this.configuration.getConfig();
  };

  /**
   * 
   * @returns 
   */
  getAvailableUsecases = function () {
    return usecases;
  };

  /**
   * 
   * @returns 
   */
  getAvailableDataTypes = function () {
    return dataTypes;
  };

  // --- Collaborative Data Exchange Start ---

  /**
   *
   * @param {*} peerName
   * @param {*} request
   * @returns {Function} - Handler for data exchange
   */
  // TODO: reject request / obsolete request after some interval
  // TODO: Limit number of connected peers
  // returns event handler send data receieved from requested peer
  requestDataFromPeer(peerName, request) {
    // sending requested peer information to server via socket event
    // to receive data from that peer
    this.socket.emit("request-peer", {
      requestorName: this.sessionID.clientName,
      requestorSocketId: this.socket.id,
      recieverPeerName: peerName,
      request,
    });

    return this.dataExchangeEventHandler;
  }

  // connects client with given peer
  /**
   * Connect a client with a specific peer
   * @param {*} peerName
   */
  async connectPeer(peerName) {
    return this.connectWithPeer(peerName);
  }

  /**
   *
   * @param {*} peerName
   * @param {*} data
   */
  //Requestor sends data to requested
  sendDataToPeer(data, usecase = 'message') {
    // TODO: send data only when peer to peer connection is established
    //Assuming the case study is 
    if (usecase === "message") {
      this.peerConn.send(
        { data: data, usecase, sender: this.sessionID.clientName }
      );
    }
    //In case its data, trigger the data partitions
    else {
      ///write here    

    }
    console.log('This is the trigger')
    return this.dataExchangeEventHandler
  }

  /**
   * ???
   * This does nothing. Rewrite with streaming large data chunks
   * @param {*} usecase
   */
  sendStreamDataToPeer(usecase) {
    this.getStreamDataChunks().forEach((chunk) => {
      this.peerConn.send({
        data: chunk,
        usecase: usecase,
        status: "incomplete",
      });
    });

    this.peerConn.send({
      data: "",
      usecase: usecase,
      status: "complete",
    });
  }

  // --- Collaborative Data Exchange End ---

  /**
   * Triggered once a connection has been achieved.
   * Defines callbacks to handle incoming data and connection events.
   */
  ready() {
    this.peerConn.on("data", (data) => {
      if (data.usecase == "decentralized") {
        this.streamEventHandler.emit("data", {
          data: data.data,
          status: data.status,
        });
      } else if (data.usecase === "message") {
        //Requested sends message data to requestor
        this.dataExchangeEventHandler.emit("data",
          data
        )
      } else if (data.usecase === "data") {
        this.lastProcessedFile = data.name
        this.calculateThroughput(data)
        //this.addDataToDB(data)
        
        //this.dataExchangeEventHandler.emit("data", data)
      }
      else {

      }
    });
  }

  // --- PeerJS connections configuration ---

  /**
   * Largely based on examples from Peer.js
   * 
   */
  initPeerJSConn(props = {}) {
    // TODO: make properties configurable
    this.myConn = new Peer(null, props ? props : {
      secure: true,
      pingInterval: 3000,
      debug: 3,
    });
    this.myConn.on("open", (id) => {
      // Workaround for peer.reconnect deleting previous id
      if (this.myConn.id === null) {
        console.log("Received null id from peer open");
        this.myConn.id = this.sessionID.clientID;
        //this.myConn.id = this.lastId;        
      } else {
        //Workaround for peer deleting peer id
        this.sessionID.clientID = this.myConn.id
        //this.lastId = this.myConn.id
      }
      console.log(`Client Name: ${this.sessionID.clientName}\nID: ${this.sessionID.clientID}`);

      //Initiate the connection right away, save session data in server right away
      this.socket.emit("join", {
        //name: this.clientName,
        sessionID: this.sessionID
      });

      // send connection successful information back to client
      this.objectCreationEvent.emit("connect", {
        connected: true,
        message: "Succesful connection.",
        obj: this,
      });

    });

    this.myConn.on("connection", (c) => {
      // Allow only a single connection

      if (this.peerConn && this.peerConn.open) {
        c.on("open", () => {
          c.send("Already connected to another client");
          setTimeout(function () {
            c.close();
          }, 500);
        });
        return;
      }

      this.peerConn = c;
      console.log("Connected to: " + this.peerConn.peer);
      this.ready();
    });

    this.myConn.on("disconnected", () => {
      console.log("Connection lost. Reconnecting...");
      console.log(this.sessionID.clientName)

      // Workaround for peer.reconnect deleting previous id
      this.myConn._id = this.sessionID.clientID;
      this.myConn._lastServerId = this.sessionID.clientID;
      this.myConn.reconnect();
    });

    this.myConn.on("close", () => {
      this.peerConn = null;
      console.log("Connection destroyed");
    });

    let outerObj = this

    this.myConn.on("error", function (err) {
      //console.log(this.lastId)
      console.log(outerObj.sessionID.clientID)
      console.log('' + err);
    });
  }

  /**
   * Create the connection between the two Peers.
   *
   * Sets up callbacks that handle any events related to the
   * connection and data received on it.
   */
  connectWithPeer(remotePeerId) {
    this.getPeersID(remotePeerId)
    // Close old connection with any other existing peers
    if (this.peerConn) {
      //Update to close an incoming connection with a new peer
      this.peerConn.dataChannel.close()
      //this.peerConn.close();
    }

    let outerObj = this;

    return new Promise((resolve, reject) => {
      this.socket.on('peer-id-value', ({ user, id }) => {
        console.log(`User: ${user}\n ID: ${id}`)
        // Create connection to destination peer specified in the input field
        outerObj.peerConn = outerObj.myConn.connect(id, {
          reliable: true,
        });

        outerObj.peerConn.on("open", () => {
          //resolve({ status: "connected" });
          console.log("Connected to: " + outerObj.peerConn.peer);
          resolve(outerObj.dataExchangeEventHandler)
        });

        //Requestor data received, handler here!
        outerObj.peerConn.on("data", (data) => {
          console.log('696');
          //console.log(data)
          if (data)
            outerObj.dataExchangeEventHandler.emit("data",
              data
              // {
              //   data: data.data,
              //   sender: data.sender,
              // }
            );
        })

        outerObj.peerConn.on("close", function () {
          console.log("Connection closed");
          resolve()
        });
      });
    })
  }

  // --- Smart Data Sharing Start ---

  // return event handler to send data to client based on given parameters/priorities
  receiveSmartData(dataPath, frequency, resolution) {
    let socketId = this.socket.id;

    // sending socket event to server for receiving smart data located in given datapath
    this.socket.emit("start-smart-data-sharing", {
      name: this.sessionID.clientName,
      socketId: socketId,
      dataPath: dataPath,
      frequency: frequency,
      resolution: resolution,
    });

    return this.smartDataEventHandler;
  }

  //TODO
  getGrib(dataPath) {

  }

  /**
   * 
   * @param {*} dataPath 
   */
  gethdf5(dataPath) {
    let socketId = this.socket.id;

    this.socket.emit("hdf5-reader", {
      name: this.sessionID.clientName,
      socketId: socketId,
      dataPath: dataPath
    })

    return this.hdf5EventHandler
  }

  /**
   * 
   * @param {*} dataPath 
   * @returns 
   */
  getnetCDF(dataPath) {
    let socketId = this.socket.id;

    this.socket.emit("netcdf-reader", {
      name: this.sessionID.clientName,
      socketId: socketId,
      dataPath: dataPath
    });

    return this.netCDFEventHandler
  }

  /**
   * 
   * @param {*} dataPath 
   * @returns 
   */

  getTIFF(dataPath) {
    let socketId = this.socket.id;

    this.socket.emit("tiff-reader", {
      name: this.sessionID.clientName,
      socketId: socketId,
      dataPath: dataPath
    });

    return this.tiffEventHandler
  }

  /**
   * Method for handling different types of data requests based on the type of data user has selected
   * The user may select 1 or multiple datatypes, however, the datastream will be done for a single
   * @param {*} fileType 
   * @returns 
   */

  dataTypeReader(fileType) {
    let socketId = this.socket.id;

    this.socket.emit("datatype-reader", {
      name: this.sessionID.clientName,
      socketId: socketId,
      dataPath: fileType
    });

    return this.dataTypesEventHandler
  }

  // update parameters / priorities for smart data sharing
  updateSmartDataPriority(frequency, resolution) {
    let socketId = this.socket.id;
    console.log(`User ${this.sessionID.clientName} has updated the frequency from `)

    // sending event for server to updata smart data sharing priorities
    this.socket.emit("update-smart-data-sharing", {
      name: this.sessionID.clientName,
      socketId: socketId,
      frequency: frequency,
      resolution: resolution,
    });
  }

  // --- Smart Data Sharing End ---

  // --- Distributed Data Analysis and Processing ---

  /**
   * 
   * @returns 
   */
  receiveTask() {
    let socketId = this.socket.id;

    this.socket.emit("get-task", {
      name: this.sessionID.clientName,
      socketId: socketId,
    });

    return this.taskDataEventHandler;
  }

  /**
   * 
   * @param {*} task 
   * @param {*} result 
   */
  // submits results for given task to server
  submitTaskResult(task, result) {
    let socketId = this.socket.id;

    this.socket.emit("task-result", {
      name: this.sessionID.clientName,
      socketId: socketId,
      task: task,
      result: result,
    });
  }

  // --- Distributed Data Analysis and Processing End ---
  dataChunks(file, maxChunkSize) {
    console.log('Callee')
    console.log('Start sending chunks')
    const fileSize = file.size;
    let fileName = file.name;
    const usecase = 'data'
    let [name, fileExt] = fileName.split('.');
    let offset = 0;

    const sendChunk = () => {
      const chunkEnd = Math.min(offset + maxChunkSize, fileSize);
      const chunkBlob = file.slice(offset, chunkEnd)

      const fileReader = new FileReader();

      fileReader.onload = (event) => {
        const chunkArray = event.target.result;
        let isLastChunk = offset + maxChunkSize >= fileSize

        //From here trigger the reassembling in indexedDB using the lastChunk event
        if (isLastChunk) {
          this.peerConn.send({ usecase, name, fileExt, chunkArray, isLastChunk, fileSize });
          console.log('All checks sent.')
        }

        else {
          console.log('Sending a chunk')
          this.peerConn.send({ offset, usecase, chunkArray, name, fileExt });
          //console.log(`Chunk sent from ${offset} to ${chunkEnd} to peer.`)
          offset += maxChunkSize;
          //Send next data chunk after 3ms. This might need change.
          setTimeout(sendChunk(), 3)
        }
      }
      //Convert to array buffer
      fileReader.readAsArrayBuffer(chunkBlob)
    }
    //First chunk
    sendChunk()
    // })
  }

  getfileData(fileInput, chunkSize = 1) {
    let maxChunkSize = chunkSize * 1024 * 1024//10 MB in bytes
    fileInput.addEventListener('change', (ev) => {
      //1 file per request
      const selectedFile = ev.target.files[0];
      //const selectedFile = fileInput.files[0];
      console.log('here')

      if (!selectedFile) {
        //reject("No file selected");
        return
      }

      console.log('Caller')

      this.dataChunks(selectedFile, maxChunkSize)
    }
    )

    if (fileInput.files.length > 0) {
      const selectedFile = fileInput.files[0];

      if (!selectedFile) {
        return;
      }

      console.log('Caller')

      this.dataChunks(selectedFile, maxChunkSize)
    }
  }

  /**
   * 
   * @param {*} start 
   * @param {*} end 
   * @param {*} size 
   * @param {*} chunk 
   * @returns 
   */
  calculateThroughput(chunk) {

    if (chunk.offset === 0 && this.dataStreamState.start === null) {
      // If chunk offset is 0, update start time
      this.dataStreamState.start = new Date()
    }

    if (chunk.isLastChunk) {
      this.dataStreamState.end = new Date();
      this.dataStreamState.size = chunk.fileSize;

      const timeTaken = this.dataStreamState.end.getTime() - this.dataStreamState.start.getTime();
      const throughPut = (this.dataStreamState.size / timeTaken).toFixed(2)
      console.log(`Total data size: ${this.dataStreamState.size}\n`);
      console.log(`Time taken for the data: ${(timeTaken / 1000).toFixed(2)} s.\n`)
      console.log(`Total data throughput: ${throughPut} b/ms.`);
      this.dataStreamState.start = null, this.dataStreamState.end = null, this.dataStreamState.size = 0;
      return
    }
    else {
      console.log('Intermission...')
      return null;
    }
  }

  concatenateResults() {
    
    return
  }

  downloadFile() {
    return
  }

}

window.HydroRTCClient = HydroRTCClient;
