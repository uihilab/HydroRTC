const main = ((port, eventIn, eventOut, path, clients) => {
  const { io } = require("socket.io-client");

  const URL = process.env.URL || `http://localhost:${port}`;
  const MAX_CLIENTS = clients;
  const POLLING_PERCENTAGE = 0.05;
  const CLIENT_CREATION_INTERVAL_IN_MS = 10;
  const EMIT_INTERVAL_IN_MS = 1000;

  let clientCount = 0;
  let lastReport = new Date().getTime();
  let packetsSinceLastReport = 0;
  let disconnectOccurred = false;
  let disconnectStartTime = 0
  let testingStartTime = new Date().getTime(); // Timestamp for disconnection start time

  const createClient = () => {
    if (disconnectOccurred) {
      const disconnectDuration = disconnectStartTime
        ? (new Date().getTime() - disconnectStartTime) / 1000
        : 0;

      console.log(`Disconnection occurred. Time taken: ${disconnectDuration} seconds`);
      process.exit(1); // Terminate the script if disconnection event occurred
    }

    const transports =
      Math.random() < POLLING_PERCENTAGE ? ["polling"] : ["polling", "websocket"];

    const socket = io(URL, {
      transports,
    });

    setInterval(() => {
      let m = socket.emit(eventIn, { dataPath: path });
      packetsSinceLastReport++;
      m.removeAllListeners(eventOut);
      if (m != null) {
        m.on(eventOut, () => {});
      }
    }, EMIT_INTERVAL_IN_MS);

    socket.on("disconnect", (reason) => {
      disconnectOccurred = true;
      disconnectStartTime = new Date().getTime();
      const disconnectDuration = disconnectStartTime - testingStartTime
      console.log(`Disconnect due to ${reason}. Time taken: ${disconnectDuration / 1000} seconds.`);
      process.exit(1);
 // Capture disconnection start time
    });

    if (++clientCount < MAX_CLIENTS) {
      setTimeout(createClient, CLIENT_CREATION_INTERVAL_IN_MS);
    }
  };

  createClient();

  const printReport = () => {
    const now = new Date().getTime();
    const durationSinceLastReport = (now - lastReport) / 1000;
    const packetsPerSeconds = (
      packetsSinceLastReport / durationSinceLastReport
    ).toFixed(2);

    console.log(
      `Client count: ${clientCount}; Duration since last report: ${durationSinceLastReport} s; Average packets received per second: ${packetsPerSeconds};`
    );

    packetsSinceLastReport = 0;
    lastReport = now;
  };

  setInterval(printReport, 5000);
})

const args = process.argv.slice(2);
if (args.length < 5) {
  console.error('Insufficient arguments. Please provide port, eventIn, and eventOut.');
  process.exit(1);
}

const port = parseInt(args[0]);
const eventIn = args[1];
const eventOut = args[2];
const path = args[3];
const clients = args[4];

main(port, eventIn, eventOut, path, clients);
