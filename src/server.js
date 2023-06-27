const  { createServer }  = require("http");
const { parse } = require("url");
const  { join, sep } = require("path");
const {
  createReadStream,
  readdirSync,
  statSync,
  promises: fsPromises,
} = require("fs");
const { Server } = require("socket.io");

class HydroRTCServer {
  /**
   * 
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

    this.server = null;

    this.io = null;
  }

  /**
   * 
   * @param {*} hostname 
   * @param {*} port 
   */
  prepareServer(hostname, port) {
    this.hostname = hostname;
    this.port = port;
    this.server = createServer(async (request, response) => {
      var uri = parse(request.url).pathname,
        filename = join(process.cwd(), uri);

      //var isWin = !!process.platform.match(/^win/);
      // specifiying default home page of the library client application
      // TODO: allow library client to specify name and location of homepage file
      const defaultHomePage = sep === "/" ? "/index.html" : "\\index.html";
      const filePath = statSync(filename).isDirectory()
        ? filename + defaultHomePage
        : filename;

      await this.serveFile(response, filePath)
    });

    // initializing Server Socket.IO
    this.io = new Server(this.server, {});

    // on receiving connection request from client
    this.io.on("connection", (socket) => {
      //Join listener
      socket.on("join", (peer) => this.joinServer(socket, peer));

      //Validating user listener
      socket.on("validate-username", (data) =>
        this.validateUser(socket, data)
      );

      //Data stream listener
      socket.on("stream-data", (peer) => this.streamData(socket, peer));

      socket.on("peers-list", (peer) => this.getPeers(peer));

      socket.on("request-peer", (data) => this.connectPeers(data));

      socket.on("start-smart-data-sharing", (peer) => this.smartDataShare(peer));

      socket.on("update-smart-data-sharing", (peer) => this.updateSmartDataShare(peer));

      socket.on("get-task", (peer) => this.getTask(peer));

      socket.on("task-result", (peer) => this.taskResult(peer));

      socket.on("disconnect", function () {
        console.log("Client disconnected...");
      });
    });
  }

  /**
   * 
   * @param {*} response 
   * @param {*} filename 
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
   * 
   * @param {*} socket 
   * @param {*} peer 
   */

  joinServer(socket, peer) {
    peer["socketId"] = socket.id;
    peer["has-stream-data"] = false;

    // TODO: check for unique peer name
    this.peers.push(peer);
    console.log("peer (%s) joined: ", peer.name);
  }

  /**
   * 
   * @param {*} socket 
   * @param {*} data 
   */

  validateUser(socket, data) {
    // checks whether username is unique or not
    let found = false;
    let username = data.name;
    for (let i = 0; i < this.peers.length; i++) {
      if (this.peers[i].name == username) {
        found = true;
        break;
      }
    }

    socket.emit("valid-username", {
      valid: !found,
    });
  }

  /**
   * 
   * @param {*} socket 
   * @param {*} peer 
   */

  streamData(socket, peer) {
    console.log("peer (%s) requested to stream data: ", peer.name);

    // default chunk size is 65536
    // to change the chunk size updated highWaterMark property
    // https://nodejs.org/api/fs.html#fs_fs_createreadstream_path_options

    let streamDataPeer = this.getPeerwithStreamData();

    // if there is a peer with stream data
    if (streamDataPeer) {
      // sending the request to that peer to send data to requesting peer
      this.io.to(streamDataPeer.socketId).emit("connect-request", {
        requestor: peer.name,
        request: "streamData",
        usecase: "decentralized",
      });
    } else {
      // TODO: Let client of the library specify data path
      let readStream = createReadStream("./data/sensor-data.txt", {
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

          stgObj.updatePeerProperty(peer.name, "has-stream-data", true);
        });
    }
  }

  /**
   * 
   * @param {*} peer 
   */

  getPeers(peer) {
    console.log("peer (%s) requested to get list of peers: ", peer.name);

    let list = [];

    this.peers.forEach((p) => {
      list.push(p);
    });

    // broadcasting peers list to all connected peers

    this.io.emit("peers", {
      peers: list,
      status: "complete",
    });
  }

  /**
   * 
   * @param {*} data 
   */

  connectPeers(data) {
    console.log(
      "peer (%s) requested to connected with peer (%s): ",
      data.requestorName,
      data.recieverPeerName
    );
    let receiverPeer;
    // finding requested peer
    this.peers.forEach((p) => {
      if (p.name == data.recieverPeerName) {
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
    console.log("peer (%s) requested to start smart data sharing: ", peer.name);

    this.smartDataSharing.dataPath = peer.dataPath;
    this.smartDataSharing.resolution = peer.resolution;
    this.smartDataSharing.frequency = peer.frequency;

    // reading images from data path folder

    let resolutions = getDirectories(this.smartDataSharing.dataPath);

    resolutions.forEach((resolution) => {
      let currDir = this.smartDataSharing.dataPath + "/" + resolution + "/";
      let rows = getDirectories(currDir);
      this.smartDataSharing.data[resolution] = {};
      // will read first row for now
      let count = 0;
      rows.forEach((row) => {
        if (count < 1) {
          let filenames = readdirSync(currDir + row + "/");
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
    console.log(
      "peer (%s) submitted result for a task (%s): ",
      (peer.name, peer.task)
    );

    console.log("Result: (%s)", peer.result);
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
  getSmartDataIntervalCallback(peer) {
    return setInterval(() => {
      let firstRow = Object.keys(
        this.smartDataSharing.data[this.smartDataSharing.resolution]
      )[0];
      this.io.to(peer.socketId).emit("smart-data", {
        resolution: this.smartDataSharing.resolution,
        rowNo: firstRow,
        filename:
          this.smartDataSharing.data[this.smartDataSharing.resolution][
            firstRow
          ][0],
        data: "",
        usecase: "smart-data",
      });
    }, parseInt(this.smartDataSharing.frequency) * 1000);
  }

  /**
   * 
   * @param {*} peer 
   */

  getTask(peer) {
    console.log("peer (%s) requested for a task: ", peer.name);

    let peerNo = 0;

    // Sending tasks to requestor peer
    // Here, we can configure to send specific task to specific peer
    this.peers.forEach((p) => {
      if (peer.name == p.name) {
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
}

// --- utiltity functions ---
const getDirectories = (source) =>
  readdirSync(source, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

this.server = new HydroRTCServer();
