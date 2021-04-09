// this file exports global objects for browser/client

const configuration = require("./configuration.js").configuration;
const io = require("socket.io-client").io;
const events = require("events");
// const Peer = require('peerjs')

this.GeoRTCClient = function (clientName) {
  let usecases = [
    "stream-data",
    "smart-data-transmission",
    "distributed-data-processing",
    "decentralized-data-distribution",
    "collaborative-data-exchange",
  ];

  let dataTypes = ["csv", "xml", "json", "js", "png"];

  // in the configuration
  // user can enable / disable usecases
  // and types of data they can send / receive
  this.setConfiguration = function (usecases, receiveDataTypes, sendDataTypes) {
    // TODO: validate all inputs
    this.configuration.setUsecases(usecases);
    this.configuration.setReceiveDataTypes(receiveDataTypes);
    this.configuration.setSendDataTypes(sendDataTypes);
  };

  this.getConfiguration = function () {
    return this.configuration.getJSON();
  };

  this.getAvailableUsecases = function () {
    return usecases;
  };

  this.getAvailableDataTypes = function () {
    return dataTypes;
  };

  this.socketEventHandlers = function () {
    this.socket.on("valid-username", (data) => {
      if (data.valid) {
        this.socket.emit("join", {
          name: this.clientName,
        });

        this.objectCreationEvent.emit("connect", {
          connected: true,
          message: "Connection is successfull",
          obj: this,
        });

        //establish peerJS connection
        initPeerJSConn();
      } else {
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

    this.socket.on("data-stream", (message) => {
      
      this.streamData += message.data
      this.streamEventHandler.emit("data", {
        data: message.data,
        status: message.status,
      });

    });

    this.socket.on("peers", (message) => {
      this.peersEventHandler.emit("data", {
        // TODO: exclude this client from peers list
        data: message.data,
        status: message.status,
      });
    });

    this.socket.on("connect-request", (message) => {

      if (message.usecase == 'decentralized') {
        connectWithPeer(message.requestor).then(response =>{
          if (response.status == "connected") {
              this.sendStreamDataToPeer(message.usecase)
          }
        })

      } else {
        
        this.connectEventHandler.emit("data", {
          requestor: message.requestor,
          request: message.request,
        });

      }
    });

    // this.socket.on("peer-accepted-request", (message) => {
    //   connectWithPeer(message.acceptedBy)
    // });
  };

  this.streamDataRequest = function () {
    // client can hold one stream data at time.
    // new stream data will update the old request.

    this.streamData = ''

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
  };

  this.getPeers = function () {
    let socketId = this.socket.id;

    this.socket.emit("peers-list", {
      name: this.clientName,
      socketId: socketId,
    });

    return this.peersEventHandler;
  };

  this.listenRequests = function () {
    return this.connectEventHandler;
  };

  // --- Collaborative Data Exchange ---

  // TODO: reject request / obsolete request after some interval
  // TODO: Limit number of connected peers
  this.requestDataFromPeer = function (peerName, request) {
    this.socket.emit("request-peer", {
      requestorName: this.clientName,
      requestorSocketId: this.socket.id,
      recieverPeerName: peerName,
      request: request,
    });

    return this.dataExchangeEventHandler;
  };

  this.connectPeer = function (peerName) {
    connectWithPeer(peerName);
    // this.socket.emit("request-accepted", {
    //   acceptedBy: this.clientName,
    //   requestor: peerName
    // });
  };

  this.sendDataToPeer = function (peerName, data) {
    // TODO: send data only when peer to peer connection is established
    this.peerConn.send({'data':data, 'usecase':''});

  };

  this.sendStreamDataToPeer = (usecase) => {
    this.getStreamDataChunks().forEach(chunk => {
      this.peerConn.send({
        'data': chunk,
        'usecase': usecase,
        'status': 'incomplete'
      });
    })

    this.peerConn.send({
      'data': '',
      'usecase': usecase,
      'status': 'complete'
    });
    
  }

  // --- Collaborative Data Exchange ---

  // init
  // TODO: ensure server is run before client
  this.clientName = clientName;
  this.configuration = configuration;
  this.objectCreationEvent = new events.EventEmitter();
  this.streamEventHandler = new events.EventEmitter();
  this.peersEventHandler = new events.EventEmitter();
  this.connectEventHandler = new events.EventEmitter();
  this.dataExchangeEventHandler = new events.EventEmitter();

  this.socket = io();
  this.socket.emit("validate-username", {
    name: this.clientName,
  });

  this.socketEventHandlers();
  this.lastId = null;
  this.peerConn = null;
  this.myConn = null;
  // this object will hold stream data once received
  this.streamData = ""

  // --- PeerJS connections configuration ---

  var initPeerJSConn = () => {
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

      // TODO: extend it for 2a
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
      ready();
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
  };

  /**
   * Triggered once a connection has been achieved.
   * Defines callbacks to handle incoming data and connection events.
   */
  var ready = () => {
    this.peerConn.on("data", (data) => {
      console.log(data)
      if (data.usecase == "decentralized") {
        
        this.streamEventHandler.emit("data", {
          data: data.data,
          status: data.status
        });

      } else {
        this.dataExchangeEventHandler.emit("data", {
          data: data,
        });
      }
    });
  };

  /**
   * Create the connection between the two Peers.
   *
   * Sets up callbacks that handle any events related to the
   * connection and data received on it.
   */
  var connectWithPeer = (remotePeerId) => {
    // Close old connection
    if (this.peerConn) {
      this.peerConn.close();
    }

    let outerObj = this
    return new Promise((resolve, reject) => {
      // Create connection to destination peer specified in the input field
      outerObj.peerConn = outerObj.myConn.connect(remotePeerId, {
        reliable: true,
      });

      outerObj.peerConn.on("open", () => {
        resolve({'status':'connected'})
        console.log("Connected to: " + outerObj.peerConn.peer);
      });

      outerObj.peerConn.on("close", function () {
        console.log("Connection closed");
      });
    })

  };

  this.getStreamDataChunks = () => {
    // chunk size in bytes
    let size = 1024
    const numChunks = Math.ceil(this.streamData.length / size)
    const chunks = new Array(numChunks)
    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
      chunks[i] = this.streamData.substr(o, size)
    }
  
    return chunks
  }

  return this.objectCreationEvent;
};

window.GeoRTCClient = this.GeoRTCClient;