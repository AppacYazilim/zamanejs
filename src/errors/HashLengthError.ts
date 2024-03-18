export class HashLengthError extends Error {
  constructor(hash: Uint8Array, expectedByteLength: number) {
    const hex = hash.reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');

    super(`Hash length is ${hex.length} (hex) or ${hash.length} (bytes) but expected ${expectedByteLength} bytes`);
  }
}
