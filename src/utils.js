import { Buffer } from "node:buffer";
import raw from "raw-socket";

const ICMP_HEADER_SIZE = 8;

/**
 * Human readable definition of ping protocol
 *
 * @typedef {Object} PingProtocol
 * @property {number} ttl - IP TTL
 * @property {number} type - Type = 8(IPv4, ICMP) 128(IPv6,ICMP6)
 * @property {number} code - Code = 0
 * @property {number} checksum - Identifier
 * @property {number} identifier - Identifier
 * @property {number} sequenceNumber - Sequence Number
 * @property {number} payloadTime - Time encoded in payload
 * @property {string} payload - Payload
 */

/**
 * Convert buffer to debug object
 *
 * @param {Buffer} buffer
 * @returns {PingProtocol}
 */
export function toProtocolObject(buffer) {
  // Since we get full IP buffer we need to skip IP Header and move to ICMP header
  // IP Header is located in bits 4-7 https://en.wikipedia.org/wiki/Internet_Protocol_version_4#IHL
  const ipOffset = (buffer.readInt8() & 0x0f) * 4;

  // IP level TTL
  const ttl = buffer.readUInt8(8);

  const type = buffer.readUInt8(ipOffset);
  const code = buffer.readUInt8(ipOffset + 1);
  const checksum = buffer.readUInt16BE(ipOffset + 2);
  const identifier = buffer.readUInt16BE(ipOffset + 4);
  const sequenceNumber = buffer.readUInt16BE(ipOffset + 6);

  const secondsPart = buffer.readUInt32BE(ipOffset + 8);
  const microseconds = buffer.readUInt32BE(ipOffset + 12);

  const payloadTime = secondsPart * 1000 + microseconds / 1000;

  const payload = buffer.toString("utf8", ipOffset + 16);

  return {
    ttl,
    type,
    code,
    checksum,
    identifier,
    sequenceNumber,
    payload,
    payloadTime,
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
export function createPingBuffer(identifier, sequenceNumber, payload) {
  const buffer = Buffer.alloc(
    ICMP_HEADER_SIZE + 8 + Buffer.byteLength(payload)
  );

  buffer.writeUInt8(8, 0);
  buffer.writeUInt8(0, 1);
  buffer.writeUInt16BE(0, 2);
  buffer.writeUInt16BE(identifier, 4);
  buffer.writeUInt16BE(sequenceNumber, 6);

  const time = performance.timeOrigin + performance.now();

  const uint32 = new Uint32Array(2);
  uint32[0] = time / 1000;
  uint32[1] = (time - uint32[0] * 1000) * 1000;

  buffer.writeUInt32BE(uint32[0], 8);
  buffer.writeUInt32BE(uint32[1], 12);
  buffer.write(payload, 16);

  raw.writeChecksum(buffer, 2, raw.createChecksum(buffer));

  return buffer;
}
