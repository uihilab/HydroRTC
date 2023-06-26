// this file exports global objects for browser/client

const { configuration } = require("./configuration.js");
const { io } = require("socket.io-client");
const { EventEmitter } = require("events");
const { Peer } = require("peerjs");

// HydroRTCClient object
class HydroRTCClient {
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
    this.dataTypes = ["csv", "xml", "json", "js", "png", "tab", "tiff", "ts"];

    this.streamData = null;

    // TODO: ensure server is run before client
    // init
    this.clientName = clientName;
    this.configuration = configuration;
    // Defining Event Handlers for sending to client
    this.objectCreationEvent = new EventEmitter();
    this.streamEventHandler = new EventEmitter();
    this.peersEventHandler = new EventEmitter();
    this.connectEventHandler = new EventEmitter();
    this.dataExchangeEventHandler = new EventEmitter();
    this.smartDataEventHandler = new EventEmitter();
    this.taskDataEventHandler = new EventEmitter();

    // initializing client socket
    this.socket = io();
    // upon object creation, send validate username event to server
    this.socket.emit("validate-username", {
      name: this.clientName,
    });

    // defining all socket event handlers
    this.socketEventHandlers();
    // id of last connecter peer
    this.lastId = null;
    // peer connection
    this.peerConn = null;
    // client's own connection
    this.myConn = null;

    // this object will hold stream data once received
    this.streamData = "";

    // event handler to send object creation status to client
    return this.objectCreationEvent;
  }

  /**
   * defining all socket event handlers
   */
  socketEventHandlers() {
    this.socket.on("valid-username", (data) => {
      // if username is valid according to server
      if (data.valid) {
        // then connect with server
        this.socket.emit("join", {
          name: this.clientName,
        });

        // send connection successful information back to client
        this.objectCreationEvent.emit("connect", {
          connected: true,
          message: "Connection is successfull",
          obj: this,
        });

        //establish peerJS connection
        this.initPeerJSConn();
      } else {
        // otherwise, disconnect from server
        this.socket.disconnect();
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
        this.clientName
      );
    });

    // on receiving data stream from server
    this.socket.on("data-stream", (message) => {
      0;
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
        if (peer.name != this.clientName) {
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
        data: "",
      });
    });

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

    // this.socket.on("peer-accepted-request", (message) => {
    //   connectWithPeer(message.acceptedBy)
    // });
  }

  /**
   * Stream data request initiator
   * @returns {Function} - Event emitter for the stream data requestor
   */

  // returns event handler for sending data stream
  streamDataRequest() {
    // client can hold one stream data at time.
    // new stream data will update the old request.
    this.streamData = "";

    if (!this.configuration.usecases.includes("stream-data")) {
      let socketId = this.socket.id;
      this.socket.emit("stream-data", {
        name: this.clientName,
        socketId: socketId,
      });

      return this.streamEventHandler;
    } else {
      console.log(
        "Client (%s) is not eligible to use stream-data usecase.",
        this.clientName
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
      name: this.clientName,
      socketId: socketId,
    });

    return this.peersEventHandler;
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

  getConfiguration = function () {
    return this.configuration.getConfig();
  };

  getAvailableUsecases = function () {
    return usecases;
  };

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
      requestorName: this.clientName,
      requestorSocketId: this.socket.id,
      recieverPeerName: peerName,
      request: request,
    });

    return this.dataExchangeEventHandler;
  }

  // connects client with given peer
  /**
   * Connect a client with a specific peer
   * @param {*} peerName
   */
  connectPeer(peerName) {
    this.connectWithPeer(peerName);
    // this.socket.emit("request-accepted", {
    //   acceptedBy: this.clientName,
    //   requestor: peerName
    // });
  }

  /**
   *
   * @param {*} peerName
   * @param {*} data
   */

  // client sends data to given peer
  sendDataToPeer(peerName, data) {
    // TODO: send data only when peer to peer connection is established
    this.peerConn.send({ data: data, usecase: "", sender: this.clientName });
  }

  /**
   * ???
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
      } else {
        this.dataExchangeEventHandler.emit("data", {
          data: data.data,
          sender: data.sender,
        });
      }
    });
  }

  // --- PeerJS connections configuration ---

  /**
   *
   */
  initPeerJSConn() {
    // TODO: make properties configurable
    this.myConn = new Peer(this.clientName, { debug: 2 });
    this.myConn.on("open", (id) => {
      // Workaround for peer.reconnect deleting previous id
      if (this.myConn.id === null) {
        console.log("Received null id from peer open");
        this.myConn.id = this.lastId;
      } else {
        this.lastId = this.myConn.id;
      }

      // console.log("ID: " + this.myConn.id);
    });

    this.myConn.on("connection", (c) => {
      // Allow only a single connection

      if (this.peerConn && this.peerConn.open) {
        c.on("open", function () {
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
      console.log("Connection lost. Please reconnect");

      // Workaround for peer.reconnect deleting previous id
      this.myConn.id = this.lastId;
      this.myConn._lastServerId = this.lastId;
      this.myConn.reconnect();
    });

    this.myConn.on("close", () => {
      this.peerConn = null;
      console.log("Connection destroyed");
    });

    this.myConn.on("error", function (err) {
      console.log(err);
    });
  }

  /**
   * Create the connection between the two Peers.
   *
   * Sets up callbacks that handle any events related to the
   * connection and data received on it.
   */
  connectWithPeer(remotePeerId) {
    // Close old connection
    if (this.peerConn) {
      this.peerConn.close();
    }

    let outerObj = this;
    return new Promise((resolve, reject) => {
      // Create connection to destination peer specified in the input field
      outerObj.peerConn = outerObj.myConn.connect(remotePeerId, {
        reliable: true,
      });

      outerObj.peerConn.on("open", () => {
        resolve({ status: "connected" });
        console.log("Connected to: " + outerObj.peerConn.peer);
      });

      outerObj.peerConn.on("close", function () {
        console.log("Connection closed");
      });
    });
  }

  // --- Smart Data Sharing Start ---

  // return event handler to send data to client based on given parameters/priorities
  receiveSmartData(dataPath, frequency, resolution) {
    let socketId = this.socket.id;

    // sending socket event to server for receiving smart data located in given datapath
    this.socket.emit("start-smart-data-sharing", {
      name: this.clientName,
      socketId: socketId,
      dataPath: dataPath,
      frequency: frequency,
      resolution: resolution,
    });

    return this.smartDataEventHandler;
  }

  // update parameters / priorities for smart data sharing
  updateSmartDataPriority(frequency, resolution) {
    let socketId = this.socket.id;

    // sending event for server to updata smart data sharing priorities
    this.socket.emit("update-smart-data-sharing", {
      name: this.clientName,
      socketId: socketId,
      frequency: frequency,
      resolution: resolution,
    });
  }

  // --- Smart Data Sharing End ---

  // --- Distributed Data Analysis and Processing ---

  receiveTask() {
    let socketId = this.socket.id;

    this.socket.emit("get-task", {
      name: this.clientName,
      socketId: socketId,
    });

    return this.taskDataEventHandler;
  }

  // submits results for given task to server
  submitTaskResult(task, result) {
    let socketId = this.socket.id;

    this.socket.emit("task-result", {
      name: this.clientName,
      socketId: socketId,
      task: task,
      result: result,
    });
  }

  // --- Distributed Data Analysis and Processing End ---

  /**
   *
   * @returns
   */
  getStreamDataChunks() {
    // chunk size in bytes
    let size = 1024;
    const numChunks = Math.ceil(this.streamData.length / size);
    const chunks = new Array(numChunks);
    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
      //change for deprecated features
      chunks[i] = this.streamData.substring(o, size);
    }

    return chunks;
  }
}

window.HydroRTCClient = HydroRTCClient;
