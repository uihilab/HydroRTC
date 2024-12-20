// this file exports global objects for browser/client
const { configuration } = require("./configuration.js");
const { io } = require("socket.io-client");
const { EventEmitter } = require("events");
const { Peer } = require("peerjs");

// HydroRTCClient object
class HydroRTCClient {
  /**
   * @description class for the HydroRTC-Client system, initializer of required variables and event emitters
   * @constructor
   * @param {String} clientName 
   * @returns {Object} - Clientside rendering
   */
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

    // TODO: ensure server is run before client starts
    this.configuration = configuration;

    // Defining Event Handlers for sending to client
    //TODO: need to modify some of this emitters

    /**List of emitters used from client server and vice versa */
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

    //Upon object creation, send validate username event to server
    this.socket.emit("validate-username", {
      clientName: this.sessionID.clientName
    });

    // this object will hold stream data once received
    this.lastProcessedFile = null;

    //Definition of the database that will hold data saved by the user
    this.dbName = `HydroRTC_DB_${clientName}`
    this.createDB(this.dbName)

    // event handler to send object creation status to client
    return this.objectCreationEvent;
  }

  /** 
   * @description Creator of the database per clientName
   * @method createDB
   * @memberof HydroRTCClient
   * @param {String} clientName 
   * @returns {null} - registers an IndexedDB store for the data to be saved
    * @example
 * const client = new HydroRTCClient();
 * client.createDB('ClientA');
 * // Output in console: "IndexedDB ClientA opened successfully."
 *
 * // Later in the code, you can use `client.db` to interact with the created IndexedDB instance.
   */
  createDB(clientName) {
    //Create a request for the DB to open
    const request = indexedDB.open(clientName, 1)

    //Handlers for the request
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
 * Adds data to the specified object store in IndexedDB.
 *
 * @method addDataToDB
 * @memberof HydroRTCClient
 * @param {Object} data - The data object to be added to the database. The object can include a `data` field that is an ArrayBuffer, which will be converted to a Blob if necessary.
 * @param {string} [storeName='data'] - The name of the object store where the data will be added. Defaults to 'data'.
 * @returns {null} - This method does not return a value. It logs success or error messages to the console.
 *
 * @description This method adds the provided data to the specified IndexedDB object store. If the data includes an ArrayBuffer, it converts it to a Blob before adding it to the store. The method also logs success or error messages based on the outcome of the addition operation.
 *
 * @example
 * const client = new HydroRTCClient();
 * client.createDB('ClientB'); // Initializes the database
 * 
 * const data = {
 *   id: 'unique-id',
 *   data: new ArrayBuffer(8),
 *   binaryData: new Uint8Array([1, 2, 3, 4])
 * };
 * 
 * client.addDataToDB(data, 'data');
 * // Output in console: "Data was correctly added to IndexedDB: unique-id"
 * 
 * // If an error occurs, it will be logged to the console.
 */

  addDataToDB(data, storeName = 'data') {
    if (!this.db) {
        console.error('IndexedDB has not been initialized.');
        return;
    }

    const transaction = this.db.transaction([storeName], 'readwrite');
    const objectStore = transaction.objectStore(storeName);

    if (!this.lastProcessedFile) {
        //To change in the future for a specific identifier, either with task or keep data, or a combination
        //Serialize in order to keep tasks
        this.lastProcessedFile = new Date().getTime();
    }

    if (data.data instanceof ArrayBuffer) {
        try {
            data.binaryData = new Blob([data.binaryData], {
                type: 'application/octet-binary'
            });
        } catch (err) {
            console.log(`There was an error saving a binary file: ${err}`);
        }
    //Add some other data types that can be saved.
    }

    // Adds data to the request
    const request = objectStore.add(data);

    request.onsuccess = () => {
        console.log(`Data was correctly added to IndexedDB: ${data.id}`);
        // Commit the transaction
        transaction.commit();
    };

    request.onerror = (ev) => {
        console.error(`Error adding data to IndexedDB: ${ev.target.error}`);
    };
}

/**
 * Retrieves all data from the specified object store in IndexedDB.
 *
 * @method getDataFromDB
 * @memberof HydroRTCClient
 * @param {string} [storeName='data'] - The name of the object store to retrieve data from. Defaults to 'data'.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of objects stored in the object store. 
 *                                   The data is processed to convert any binary data stored as a Blob into an ArrayBuffer.
 * @throws {Error} Will reject the promise with an error message if IndexedDB is not initialized or if there is an error during the retrieval process.
 *
 * @description This method retrieves all data from the specified object store in IndexedDB. If the data includes binary data stored as a Blob, it is converted into an ArrayBuffer. The method returns a promise that resolves with the processed data or rejects with an error message if any issues occur.
 *
 * @example
 * const client = new HydroRTCClient();
 * client.createDB('ClientC'); // Initializes the database
 * 
 * client.getDataFromDB('data')
 *   .then(data => {
 *     console.log('Retrieved data:', data);
 *   })
 *   .catch(error => {
 *     console.error('Error retrieving data:', error);
 *   });
 * // Output: "Retrieved data: [/* array of objects */


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
 * @description Deletes data from the IndexedDB store.
 * @method deleteDataFromDB
 * @memberof HydroRTCClient
 * @param {String} itemID - The ID of the item to be deleted.
 * @param {string} [storeName='data'] - The name of the store from which data will be deleted.
 * @returns {Promise<void>} - A promise that resolves when the item is successfully deleted.
 * @example
 * // Usage example:
 * deleteDataFromDB(123, 'storeName')
 *   .then(() => {
 *     console.log('Item deleted successfully.');
 *   })
 *   .catch((error) => {
 *     console.error(error);
 *   });
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
 * @description Deletes the IndexedDB database.
 * @method deleteDB
 * @memberof HydroRTCClient
 * @returns {Promise<void>} - A promise that resolves when the database is successfully deleted.
 * @throws {Error} Throws an error if the IndexedDB database name is not specified.
 * @example
 * // Usage example:
 * deleteDB()
 *   .then(() => {
 *     console.log('IndexedDB database deleted successfully.');
 *   })
 *   .catch((error) => {
 *     console.error(error);
 *   });
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
 * @description Logs out the user by deleting the IndexedDB database.
 * @method logout
 * @memberof HydroRTCClient
 * @returns {Promise<void>} - A promise that resolves when the user is successfully logged out.
 * @example
 * // Usage example:
 * logout()
 *   .then(() => {
 *     console.log('User logged out successfully.');
 *   })
 *   .catch((error) => {
 *     console.error('Error during logout: ', error);
 *   });
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
 * Sets up event handlers for various socket events.
 *
 * @method socketEventHandlers
 * @memberof HydroRTCClient
 * @returns {void}
 *
 * @description This method initializes handlers for different socket events including user validation, data streams, peers, and file types. Each handler processes incoming data from the server and triggers the corresponding event handlers within the client.
 *
 * @example
 * const client = new HydroRTCClient();
 * client.socketEventHandlers();
 * 
 * // The socketEventHandlers method sets up handlers for events such as:
 * // - "valid-username": Handles validation of usernames.
 * // - "connect": Logs connection status.
 * // - "data-stream": Processes incoming data streams.
 * // - "peers": Manages peer lists.
 * // - "smart-data": Handles smart data streams.
 * // - "netcdf-data", "hdf5-data", "tiff-data": Handles different file types.
 * // - "datatype-files": Manages data type requests.
 * // - "connect-request": Manages peer connection requests.
 * // - "task": Handles tasks from the server.
 * // - "data-upload": Handles user data uploads.
 * // - "delete-db": Deletes the database and logs a message.
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
      this.socket.emit('tiff-data-request', (() => { console.log('TIFF data submitted') }))
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
 * Requests streaming data from the server for a specified file path.
 *
 * @method streamDataRequest
 * @memberof HydroRTCClient
 * @param {string} filePath - The path to the file for which streaming data is requested.
 * @returns {EventEmitter|null} An EventEmitter instance for handling stream data events if the request is successful. Returns `null` if the client is not eligible for the "stream-data" use case.
 *
 * @description This method requests streaming data from the server for a given file path. It resets the `streamData` property to ensure that only one stream of data is handled at a time. If the client is eligible for the "stream-data" use case, it emits a "stream-data" event to the server with the client name, socket ID, and file path. The method returns an EventEmitter instance to handle the stream data events or `null` if the client is not eligible.
 *
 * @example
 * const client = new HydroRTCClient();
 * const filePath = '/path/to/file';
 * 
 * const streamHandler = client.streamDataRequest(filePath);
 * 
 * if (streamHandler) {
 *   streamHandler.on('data', (data) => {
 *     console.log('Received stream data:', data);
 *   });
 * } else {
 *   console.log('Client is not eligible for stream-data use case.');
 * }
 */

  streamDataRequest(filePath) {
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
 * @method getPeers
 * @description Retrieves the list of peers for the current client
 * @memberof HydroRTCClient
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
 * @method getPeersID
 * @description Retrieves the peer ID for the specified remote peer
 * @memberof HydroRTCClient
 * @param {String} remotePeerId - The ID of the remote peer
 * @returns {Function} - Event emitter for the peer listener
 */
  getPeersID(remotePeerId) {
    //Obtain the peer ID if found in the server
    this.socket.emit("peer-id", {
      clientName: remotePeerId,
    });
    return this.peersEventHandler
  }

/**
 * @method listenRequests
 * @description Enables the client to receive connection requests from other peers
 * @memberof HydroRTCClient
 * @returns {Function} - Event handler for the connection request
 */
  // makes the client eligible to receive requests from other peer
  // returns event handler to send information of peer who initiated the request
  listenRequests() {
    return this.connectEventHandler;
  }

/**
 * @method setConfiguration
 * @description Configures the client's use cases and data types for sending and receiving
 * @memberof HydroRTCClient
 * @param {string[]} usecases - The use cases to be enabled for the client
 * @param {string[]} receiveDataTypes - The data types the client can receive
 * @param {string[]} sendDataTypes - The data types the client can send
 */
  setConfiguration(usecases, receiveDataTypes, sendDataTypes) {
    // TODO: validate all inputs
    this.configuration.setUsecases(usecases);
    this.configuration.setReceiveDataTypes(receiveDataTypes);
    this.configuration.setSendDataTypes(sendDataTypes);
  }

/**
 * @method getConfiguration
 * @description Retrieves the current configuration of the client
 * @memberof HydroRTCClient
 * @returns {Object} - The current configuration of the client
 */
  getConfiguration = function () {
    return this.configuration.getConfig();
  };

/**
 * @method getAvailableUsecases
 * @description Retrieves the available use cases for the client
 * @memberof HydroRTCClient
 * @returns {string[]} - The available use cases
 */
  getAvailableUsecases = function () {
    return usecases;
  };

/**
 * @method getAvailableDataTypes
 * @description Retrieves the available data types for the client
 * @memberof HydroRTCClient
 * @returns {string[]} - The available data types
 */
  getAvailableDataTypes = function () {
    return dataTypes;
  };

  // --- Collaborative Data Exchange Start ---

/**
 * @method requestDataFromPeer
 * @description Requests data from a specified peer
 * @memberof HydroRTCClient
 * @param {string} peerName - The name of the peer to request data from
 * @param {Promise} request - The data request to be sent to the peer
 * @returns {Function} - The event handler for the data exchange
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
 * @method connectPeer 
 * @description Connect a client with a specific peer
 * @memberof HydroRTCClient
 * @param {string} peerName - The name of the peer to connect to
 * @returns {Promise<void>} - A promise that resolves when the connection is established
 */
  async connectPeer(peerName) {
    return this.connectWithPeer(peerName);
  }

/**
 * @method sendDataToPeer
 * @description Send data to a connected peer
 * @memberof HydroRTCClient
 * @param {Object} data - The data to be sent to the peer
 * @param {string} [usecase='message'] - The use case for the data being sent (default is 'message')
 * @returns {Promise<void>} - A promise that resolves when the data has been sent
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
    console.log('Requested exchange.')
    return this.dataExchangeEventHandler
  }

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
   * @method ready - Triggered once a connection has been achieved.Defines callbacks to handle incoming data and connection events.
   * @memberof HydroRTCClient
 * Initializes the event listeners for the peer connection and handles incoming data based on the use case.
 * @returns {void} 
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
 * Initializes the PeerJS connection for the HydroRTCClient.
 * @method initPeerJSConn
 * @memberof HydroRTCClient
 * @param {Object} [props={}] - Optional configuration properties for the PeerJS connection.
 * @param {boolean} [props.secure=true] - Whether to use a secure connection.
 * @param {number} [props.pingInterval=3000] - The interval (in milliseconds) at which to send a ping to the PeerJS server.
 * @param {number} [props.debug=3] - The debug level for the PeerJS connection.
 * @returns {void}
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
    * Connects to a remote peer using the PeerJS connection.
 * @method connectWithPeer
 * @memberof HydroRTCClient
 * @param {string} remotePeerId - The ID of the remote peer to connect to.
 * @returns {Promise<Function>} - A promise that resolves to the `dataExchangeEventHandler` function.
 * @example
 * const client = new HydroRTCClient();
 * client.connectWithPeer('remotePeerId')
 *   .then((dataExchangeEventHandler) => {
 *     // Use the dataExchangeEventHandler to handle data exchange events
 *   });
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

/**
 * Initiates the reception of smart data from the server.
 * @method receiveSmartData
 * @memberof HydroRTCClient
 * @param {string} dataPath - The path to the smart data to receive.
 * @param {number} frequency - The frequency at which to receive the smart data.
 * @param {number} resolution - The resolution of the smart data.
 * @returns {EventEmitter} - An event emitter that emits the received smart data.
 * @example
 * const client = new HydroRTCClient();
 * const smartDataEventHandler = client.receiveSmartData('/path/to/data', 1000, 100);
 * smartDataEventHandler.on('data', (data) => {
 *   console.log(data);
 * });
 */
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
 * Initiates the retrieval of HDF5 data from the server.
 * @method getHDF5
 * @memberof HydroRTCClient
 * @param {string} dataPath - The path to the HDF5 data to retrieve.
 * @returns {EventEmitter} - An event emitter that emits the retrieved HDF5 data.
 * @example
 * const client = new HydroRTCClient();
 * const hdf5EventHandler = client.getHDF5('/path/to/hdf5/data');
 * hdf5EventHandler.on('data', (data) => {
 *   console.log(data);
 * });
 */
  gethdf5({dataPath = null, fileBuffer = null}) {
    let socketId = this.socket.id;

    this.socket.emit("hdf5-reader", {
      name: this.sessionID.clientName,
      socketId: socketId,
      dataPath: dataPath,
      fileBuffer: fileBuffer
    })

    return this.hdf5EventHandler
  }

/**
 * Initiates the retrieval of netCDF data from the server.
 * @method getNetCDF
 * @memberof HydroRTCClient
 * @param {string} dataPath - The path to the netCDF data to retrieve.
 * @returns {EventEmitter} - An event emitter that emits the retrieved netCDF data.
 * @example
 * const client = new HydroRTCClient();
 * const netCDFEventHandler = client.getNetCDF('/path/to/netcdf/data');
 * netCDFEventHandler.on('data', (data) => {
 *   console.log(data);
 * });
 */
  getnetCDF({dataPath = null, fileBuffer = null}) {
    let socketId = this.socket.id;

    this.socket.emit("netcdf-reader", {
      name: this.sessionID.clientName,
      socketId: socketId,
      dataPath: dataPath,
      fileBuffer: fileBuffer
    });

    return this.netCDFEventHandler
  }

/**
 * Initiates the retrieval of TIFF data from the server.
 * @method getTIFF
 * @memberof HydroRTCClient
 * @param {string} dataPath - The path to the TIFF data to retrieve.
 * @returns {EventEmitter} - An event emitter that emits the retrieved TIFF data.
 * @example
 * const client = new HydroRTCClient();
 * const tiffEventHandler = client.getTIFF('/path/to/tiff/data');
 * tiffEventHandler.on('data', (data) => {
 *   console.log(data);
 * });
 */
  getTIFF({dataPath = null, fileBuffer = null}) {
    let socketId = this.socket.id;

    this.socket.emit("tiff-reader", {
      name: this.sessionID.clientName,
      socketId: socketId,
      dataPath: dataPath,
      fileBuffer: fileBuffer
    });

    return this.tiffEventHandler
  }

/**
 * Initiates the retrieval of data types supported by the server.
 * @method dataTypeReader
 * @memberof HydroRTCClient
 * @param {string} fileType - The type of data file to retrieve the supported data types for.
 * @returns {EventEmitter} - An event emitter that emits the supported data types.
 * @example
 * const client = new HydroRTCClient();
 * const dataTypesEventHandler = client.dataTypeReader('hdf5');
 * dataTypesEventHandler.on('data', (dataTypes) => {
 *   console.log(dataTypes);
 * });
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

/**
 * Updates the priority of smart data sharing based on the specified frequency and resolution.
 * @method updateSmartDataPriority
 * @memberof HydroRTCClient
 * @param {number} frequency - The desired frequency of data updates.
 * @param {number} resolution - The desired resolution of the data.
 * @returns {void}
 * @example
 * const client = new HydroRTCClient();
 * client.updateSmartDataPriority(1000, 10);
 */
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
 * Retrieves a task from the server.
 * @method receiveTask
 * @memberof HydroRTCClient
 * @returns {EventEmitter} - An event emitter that emits the task data.
 * @example
 * const client = new HydroRTCClient();
 * const taskDataEventHandler = client.receiveTask();
 * taskDataEventHandler.on('data', (taskData) => {
 *   console.log(taskData);
 * });
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
 * Submits the result of a task to the server.
 * @method submitTaskResult
 * @memberof HydroRTCClient
 * @param {object} task - The task object.
 * @param {object} result - The result of the task.
 * @returns {void}
 * @example
 * const client = new HydroRTCClient();
 * const task = { id: 1, description: 'Perform data analysis' };
 * const result = { analysis: 'The data shows a positive trend' };
 * client.submitTaskResult(task, result);
 */
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
  /**
 * Sends a file in chunks to a peer connection.
 * @method dataChunks
 * @memberof HydroRTCClient
 * @param {File} file - The file to be sent.
 * @param {number} maxChunkSize - The maximum size of each chunk in bytes.
 * @returns {void}
 * @example
 * const client = new HydroRTCClient();
 * const file = new File(['Hello, World!'], 'hello.txt', { type: 'text/plain' });
 * client.dataChunks(file, 1024);
 */
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
          console.log('All file chunks sent.')
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

  /**
 * Retrieves file data from an input element and sends it in chunks to a peer connection.
 * @method getfileData
 * @memberof HydroRTCClient
 * @param {HTMLInputElement} fileInput - The file input element to retrieve the file from.
 * @param {number} [chunkSize=1] - The size of each chunk in megabytes. Default is 1 MB.
 * @returns {void}
 * @example
 * const fileInput = document.getElementById('file-input');
 * const client = new HydroRTCClient();
 * client.getfileData(fileInput, 10); // Send file in 10 MB chunks
 */
  getfileData(fileInput, chunkSize = 1) {
    let maxChunkSize = chunkSize * 1024 * 1024//10 MB in bytes
    fileInput.addEventListener('change', (ev) => {
      //1 file per request
      const selectedFile = ev.target.files[0];
      //const selectedFile = fileInput.files[0];
      console.log('Datafile selected.')

      if (!selectedFile) {
        //reject("No file selected");
        return
      }

      console.log('Initializing data submission request.')

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
 * Calculates the throughput of a data stream.
 * @method calculateThroughput
 * @memberof HydroRTCClient
 * @param {Object} chunk - The current chunk of data being sent.
 * @param {number} chunk.offset - The offset of the current chunk in the file.
 * @param {number} chunk.fileSize - The total size of the file in bytes.
 * @param {boolean} chunk.isLastChunk - Indicates whether the current chunk is the last one.
 * @returns {void|null}
 * @example
 * const client = new HydroRTCClient();
 * const chunk = {
 *   offset: 0,
 *   fileSize: 1024 * 1024, // 1 MB
 *   isLastChunk: true
 * };
 * client.calculateThroughput(chunk);
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

  /**
 * Concatenates multiple ArrayBuffers into a single ArrayBuffer.
 *
 * @method concatenateResults
 * @memberof HydroRTCClient
 * @param {Array<ArrayBuffer>} arrayBuffers - An array of ArrayBuffer objects to be concatenated.
 * @returns {ArrayBuffer} A new ArrayBuffer containing the concatenated data from all input ArrayBuffers.
 *
 * @description This method takes an array of ArrayBuffer objects, calculates the total length required, and creates a new ArrayBuffer to hold the concatenated data. It copies the contents of each input ArrayBuffer into the new ArrayBuffer and returns it.
 *
 * @example
 * const client = new HydroRTCClient();
 * const arrayBuffer1 = new Uint8Array([1, 2, 3]).buffer;
 * const arrayBuffer2 = new Uint8Array([4, 5, 6]).buffer;
 * 
 * const concatenatedBuffer = client.concatenateResults([arrayBuffer1, arrayBuffer2]);
 * 
 * // concatenatedBuffer will be an ArrayBuffer with data [1, 2, 3, 4, 5, 6]
 */
  concatenateResults(arrayBuffers) {
        // Calculate the total length of all arrayBuffers
        let totalLength = 0;
        for (let i = 0; i < arrayBuffers.length; i++) {
            totalLength += arrayBuffers[i].byteLength;
        }
    
        // Create a new ArrayBuffer with the total length
        let concatenatedArrayBuffer = new ArrayBuffer(totalLength);
        let concatenatedUint8Array = new Uint8Array(concatenatedArrayBuffer);
    
        // Copy each arrayBuffer into the concatenatedArrayBuffer
        let offset = 0;
        for (let i = 0; i < arrayBuffers.length; i++) {
            let arrayBuffer = arrayBuffers[i];
            let uint8Array = new Uint8Array(arrayBuffer);
            concatenatedUint8Array.set(uint8Array, offset);
            offset += uint8Array.length;
        }
    
        return concatenatedArrayBuffer;
  }

  downloadFile() {
    return
  }

}

window.HydroRTCClient = HydroRTCClient;
