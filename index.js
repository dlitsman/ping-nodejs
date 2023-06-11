import { Buffer } from "node:buffer";
import raw from "raw-socket";

const ICMP_HEADER_SIZE = 8;

/**
 * Human readable definition of ping protocol
 *
 * @typedef {Object} PingProtocol
 * @property {number} type - Type = 8(IPv4, ICMP) 128(IPv6,ICMP6)
 * @property {number} code - Code = 0
 * @property {number} checksum - Identifier
 * @property {number} identifier - Identifier
 * @property {number} sequenceNumber - Sequence Number
 * @property {string} payload - Payload
 */

/**
 * Convert buffer to debug object
 *
 * @param {Buffer} buffer
 * @returns {PingProtocol}
 */
function toProtocolObject(buffer) {
  // Since we get full IP buffer we need to skip IP Header and move to ICMP header
  // IP Header is located in bits 4-7 https://en.wikipedia.org/wiki/Internet_Protocol_version_4#IHL
  const ipOffset = (buffer.readInt8() & 0x0f) * 4;

  const type = buffer.readUInt8(ipOffset);
  const code = buffer.readUInt8(ipOffset + 1);
  const checksum = buffer.readUInt16BE(ipOffset + 2);
  const identifier = buffer.readUInt16BE(ipOffset + 4);
  const sequenceNumber = buffer.readUInt16BE(ipOffset + 6);
  const payload = buffer.toString("utf8", ipOffset + 8);

  return {
    type,
    code,
    checksum,
    identifier,
    sequenceNumber,
    payload,
  };
}

/**
 * Convert buffer to debug object
 *
 * @param {PingProtocol} ping
 * @property {number} identifier - Identifier
 * @property {number} sequenceNumber - Sequence Number
 * @param {string} payload - payload string to send with ping request
 * @returns {Buffer}
 */
function createPingBuffer(identifier, sequenceNumber, payload) {
  const buffer = Buffer.alloc(ICMP_HEADER_SIZE + Buffer.byteLength(payload));

  buffer.writeUInt8(8, 0);
  buffer.writeUInt8(0, 1);
  buffer.writeUInt16BE(0, 2);
  buffer.writeUInt16BE(identifier, 4);
  buffer.writeUInt16BE(sequenceNumber, 6);
  buffer.write(payload, 8);

  raw.writeChecksum(buffer, 2, raw.createChecksum(buffer));

  return buffer;
}

const socket = raw.createSocket({ protocol: raw.Protocol.ICMP });

socket.on("message", function (buffer, source) {
  console.log("received " + buffer.length + " bytes from " + source);
  console.log("buffer", toProtocolObject(buffer));
});

const buffer = createPingBuffer(123, 0, "akldsjflksdjlfjsdlfjsd");
console.log(buffer);
socket.send(buffer, 0, buffer.length, "1.1.1.1", function (error, bytes) {
  if (error) console.log(error.toString());
});

setInterval(() => {
  // socket.send(buffer, 0, buffer.length, "1.1.1.1", function (error, bytes) {
  //   if (error) console.log(error.toString());
  // });
}, 1000);
