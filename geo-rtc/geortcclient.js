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
    this.socket.on("connect", () => {
      console.log(
        "Client (%s) Socket Connected with server: ",
        this.clientName
      );
    });
    this.socket.on("data-stream", (message) => {
      this.streamEventHandler.emit("data", {
        data: message.data,
        status: message.status,
      });
    });
  };

  this.streamData = function () {
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

  // Collaborative Data Exchange
  this.requestDataFromPeer = function (peerName) {
    
  };

  this.sendDataToPeer = function (peerName, data) {
    join(peerName, data)
    
  };

  // init
  // TODO: ensure server is run before client
  this.clientName = clientName;
  this.configuration = configuration;
  this.streamEventHandler = new events.EventEmitter();
  this.dataExchangeEventHandler = new events.EventEmitter();

  this.socket = io();
  this.socket.emit("join", {
    name: this.clientName,
  });
  this.socketEventHandlers();
  this.lastId = null;
  this.conn = null;

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

    console.log("ID: " + this.myConn.id);
  });

  this.myConn.on("connection", (c) => {
    // Allow only a single connection
    if (this.conn && this.conn.open) {
      c.on("open", function () {
        c.send("Already connected to another client");
        setTimeout(function () {
          c.close();
        }, 500);
      });
      return;
    }

    this.conn = c;
    console.log("Connected to: " + this.conn.peer);
    ready()
    
  });

  this.myConn.on("disconnected", () => {
    console.log("Connection lost. Please reconnect");

    // Workaround for peer.reconnect deleting previous id
    this.myConn.id = this.lastId;
    this.myConn._lastServerId = this.lastId;
    this.myConn.reconnect();
  });

  this.myConn.on("close", () => {
    this.conn = null;
    console.log("Connection destroyed");
  });

  this.myConn.on("error", function (err) {
    console.log(err);
  });

  /**
   * Triggered once a connection has been achieved.
   * Defines callbacks to handle incoming data and connection events.
   */
  var ready = () => {
    this.conn.on("data", function (data) {
      console.log("Data recieved");
      console.log(data);
    });
    this.conn.on("close",  () => {
      this.conn = null;
    });
  }

  /**
   * Create the connection between the two Peers.
   *
   * Sets up callbacks that handle any events related to the
   * connection and data received on it.
   */
  var join = (remotePeerId, data) => {
    // Close old connection
    if (this.conn) {
      this.conn.close();
    }

    // Create connection to destination peer specified in the input field
    this.conn = this.myConn.connect(remotePeerId, {
      reliable: true,
    });

    this.conn.on("open", () => {
      console.log("Connected to: " + this.conn.peer);
      this.conn.send(data);
      console.log("Sent: " + data);

    //   if (command) this.conn.send('request');
    });
    // Handle incoming data (messages only since this is the signal sender)
    this.conn.on("data", function (data) {
      console.log('Received: ' + data);
    });
    this.conn.on("close", function () {
     console.log("Connection closed");
    });
  }
};

window.GeoRTCClient = this.GeoRTCClient;
