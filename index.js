import raw from "raw-socket";
import { createPingBuffer, toProtocolObject } from "./src/utils.js";
import dns from "node:dns";
const dnsPromises = dns.promises;

const pingServer = process.argv[2];
if (!pingServer) {
  throw new Error("Please provide a server to ping");
}

const { address } = await dnsPromises.lookup(pingServer, { family: 4 });

const IDENTIFIER = 1111;
const TIMEOUT_MS = 1000;

const socket = raw.createSocket({ protocol: raw.Protocol.ICMP });

socket.on("message", function (buffer, source) {
  const pingObject = toProtocolObject(buffer);
  if (pingObject.identifier !== IDENTIFIER) {
    return;
  }

  const timeNow = performance.timeOrigin + performance.now();

  const diff = timeNow - pingObject.payloadTime;

  console.log(
    `${buffer.length} bytes from ${source}: icmp_seq=${pingObject.sequenceNumber} ttl=${pingObject.ttl} time=${diff} ms`
  );
});

socket.on("error", (e) => {
  console.log("Socket Error: ", e);
  socket.close();
});

console.log(`PING ${pingServer} (${address}): 56 data bytes`);

const buffer = createPingBuffer(IDENTIFIER, 0, "Hi from custom ping!");
socket.send(buffer, 0, buffer.length, address, function (error, bytes) {
  if (error) console.log("Unable to send message: ", error.toString());
});
