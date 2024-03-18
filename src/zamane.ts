import fs from 'fs';
import { ZamaneCredentials } from './credentials';
import {
  FileNotReadableError,
  InvalidHexError,
  TssAdressNotHttpOrHttpsError,
  TssAdressNotParsableError
} from './errors/invalidCredentialsError';
import { createHash } from 'crypto';
import { hashByteLength, HashingAlgorithm } from './hashingAlgoritms';
import { TimeStampRequest } from './TimeStampRequest';
import { tssRequest } from './http_utils';
import { HashLengthError } from './errors/HashLengthError';

export class Zamane {
  private readonly hashAlgorithm: HashingAlgorithm;

  constructor(private readonly credentials: ZamaneCredentials) {
    const server = this.credentials.tssAddress;

    try {
      const serverUrl = new URL(server);

      if (serverUrl.protocol !== 'http:' && serverUrl.protocol !== 'https:') {
        throw new TssAdressNotHttpOrHttpsError();
      }
    } catch (error) {
      throw new TssAdressNotParsableError();
    }

    this.hashAlgorithm = credentials.hashAlgorithm;
  }

  async hashFromPath(filePath: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      // Ensure the hash instance is created with the specified algorithm.

      fs.open(filePath, 'r', (error, fd) => {
        if (error) {
          reject(new FileNotReadableError());
          return;
        }

        const stream = fs.createReadStream('', {
          fd: fd,
          autoClose: true
        });

        const hash = createHash(this.hashAlgorithm);

        stream.on('data', (chunk) => {
          hash.update(chunk);
        });

        stream.on('end', () => {
          // When the stream ends, finalize the hash and resolve the promise.
          const fileHash = hash.digest();
          resolve(fileHash);
        });

        stream.on('error', (error) => {
          // In case of an error reading the file, reject the promise.
          reject(error);
        });
      });
    });
  }
  async hashFromContent(content: Buffer): Promise<Buffer> {
    return new Promise((resolve) => {
      const hash = createHash(this.hashAlgorithm);
      hash.update(content);
      resolve(hash.digest());
    });
  }
  async hashFromString(content: string): Promise<Buffer> {
    return new Promise((resolve) => {
      const hash = createHash(this.hashAlgorithm);
      hash.update(content);
      resolve(hash.digest());
    });
  }

  static hexToArrayBuffer(hash: string): Uint8Array {
    // check if the hash is a valid hex string
    if (!/^[0-9A-Fa-f]{2,}$/.test(hash)) {
      throw new InvalidHexError();
    }

    return new Uint8Array(hash.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
  }

  public async timeStampRequest(hash: Uint8Array): Promise<Buffer> {
    const expectedLength = hashByteLength[this.hashAlgorithm];

    if (hash.length !== expectedLength) {
      throw new HashLengthError(hash, expectedLength);
    }

    // create a new TimeStampRequest
    const request = new TimeStampRequest(this.hashAlgorithm, hash);
    // get the ASN.1 payload
    const payload = request.getAsn1Payload();
    // send the request to the TSS server
    return await tssRequest(this.credentials.tssAddress, Buffer.from(payload));
  }
}
