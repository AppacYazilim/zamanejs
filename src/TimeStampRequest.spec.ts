import { TimeStampRequest } from './TimeStampRequest';
import { Zamane } from './zamane';
import { ASN1UniversalType, DERElement } from 'asn1-ts';

import { execSync } from 'child_process';

describe('TimeStampRequest Tests', () => {
  it('should construct TimeStampRequest', () => {
    // Arrange
    const hashAlgorithm = 'SHA-256';
    const hashValue = new Uint8Array([1, 2, 3, 4, 5]);

    // Act
    const request = new TimeStampRequest(hashAlgorithm, hashValue);

    // Assert
    expect(request).toBeDefined();
  });

  it('should get ASN.1 payload', () => {
    // Arrange
    const hashAlgorithm = 'SHA-256';
    const hashValue = new Uint8Array([1, 2, 3, 4, 5]);
    const request = new TimeStampRequest(hashAlgorithm, hashValue);

    // Act
    const payload = request.getAsn1Payload();

    // Assert
    expect(payload).toBeDefined();
  });

  it('should match the snapshot', () => {
    const snapshot = 'src/asn1_tests/request.tsq';

    // Arrange
    const hashAlgorithm = 'SHA-256';
    const hashValue = Zamane.hexToArrayBuffer('DFFD6021BB2BD5B0AF676290809EC3A53191DD81C7F70A4B28688A362182986F');
    const nonce = Zamane.hexToArrayBuffer('0D5C40DA4679AA6F');

    const request = new TimeStampRequest(hashAlgorithm, hashValue, nonce);

    // Act
    const payload = request.getAsn1Payload();

    // Assert
    expect(payload).toBeDefined();

    // expect openssl asn1parse to match the snapshot
    const snapshotOut = execSync('openssl asn1parse -inform DER -in ' + snapshot).toString();

    const out = execSync('openssl asn1parse -inform DER', {
      input: Buffer.from(payload)
    }).toString();
    expect(out).toBe(snapshotOut);
  });

  it('should generate random values', () => {
    // Arrange
    const hashAlgorithm = 'SHA-256';
    const hashValue = new Uint8Array([1, 2, 3, 4, 5]);
    const request = new TimeStampRequest(hashAlgorithm, hashValue);

    // Act
    const nonce = new Uint8Array(8);
    request.getRandomValues(nonce);

    // Assert
    expect(nonce).toBeDefined();

    // make sure the nonce is not all zeros
    let allZeros = true;
    for (let i = 0; i < nonce.length; i++) {
      if (nonce[i] !== 0) {
        allZeros = false;
        break;
      }
    }
    expect(allZeros).toBe(false);
  });

  it.each([
    { bytes: [0, 0, 0, 0, 0, 0, 0, 1], encoded: [1] },
    { bytes: [0x80, 0, 0, 0, 0, 0, 0, 1], encoded: [0, 0x80, 0, 0, 0, 0, 0, 0, 1] },
    { bytes: [0, 0xff, 0, 0, 0, 0, 0, 1], encoded: [0, 0xff, 0, 0, 0, 0, 0, 1] }
  ])('encodes nonce bytes as a positive, minimal DER INTEGER: %j', ({ bytes, encoded }) => {
    const payload = new TimeStampRequest('SHA-256', new Uint8Array(32), new Uint8Array(bytes)).getAsn1Payload();
    const request = new DERElement();
    request.fromBytes(payload);
    const nonce = request.sequence[2];

    expect(nonce.tagNumber).toBe(ASN1UniversalType.integer);
    expect(Array.from(nonce.value)).toEqual(encoded);
    expect(BigInt(nonce.integer)).toBe(BigInt('0x' + Buffer.from(bytes).toString('hex')));
  });

  it.each([new Uint8Array(0), new Uint8Array(7), new Uint8Array(33), null, '12345678', [1, 2, 3, 4, 5, 6, 7, 8]])(
    'rejects an invalid nonce before encoding: %j',
    (nonce) => {
      expect(() => new TimeStampRequest('SHA-256', new Uint8Array(32), nonce as Uint8Array)).toThrow(
        'Nonce must be a Uint8Array containing 8 to 32 bytes'
      );
    }
  );
});
