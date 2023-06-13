import raw from "raw-socket";
import {
  createPingBuffer,
  toProtocolObject,
  DATE_HEADER_SIZE,
  getIPProtocolHeaderSize,
} from "./src/utils.js";
import dns from "node:dns";
const dnsPromises = dns.promises;

const pingServer = process.argv[2];
if (!pingServer) {
  throw new Error("Please provide a server to ping");
}

const { address } = await dnsPromises.lookup(pingServer, { family: 4 });

const IDENTIFIER = 1111;
const TIMEOUT_MS = 1000;
const PAYLOAD = "Hi from custom ping!";

const socket = raw.createSocket({ protocol: raw.Protocol.ICMP });
const stats = new Map();
let currentSequence = 0;

socket.on("message", function (buffer, source) {
  const pingObject = toProtocolObject(buffer);
  if (pingObject.identifier !== IDENTIFIER || pingObject.type !== 0) {
    return;
  }

  const timeNow = performance.timeOrigin + performance.now();
  const diff = timeNow - pingObject.payloadTime;

  stats.set(currentSequence, {
    diff,
    ttl: pingObject.ttl,
  });

  const dataSize = buffer.length - getIPProtocolHeaderSize(buffer);

  console.log(
    `${dataSize} bytes from ${source}: icmp_seq=${pingObject.sequenceNumber} ttl=${pingObject.ttl} time=${diff} ms`
  );
});

socket.on("error", (e) => {
  console.log("Socket Error: ", e);
  socket.close();
});

const bufferSize = DATE_HEADER_SIZE + Buffer.byteLength(PAYLOAD);
console.log(`PING ${pingServer} (${address}): ${bufferSize} data bytes`);

function sendPing(sequence) {
  const buffer = createPingBuffer(IDENTIFIER, sequence, PAYLOAD);
  socket.send(buffer, 0, buffer.length, address, function (error, bytes) {
    if (error) console.log("Unable to send message: ", error.toString());
  });
}

sendPing(currentSequence);

setInterval(() => {
  if (!stats.has(currentSequence)) {
    console.log(`Request timeout for icmp_seq ${currentSequence}`);
  }
  currentSequence++;

  sendPing(currentSequence);
}, TIMEOUT_MS);
