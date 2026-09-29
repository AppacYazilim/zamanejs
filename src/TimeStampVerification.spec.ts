import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import { DERElement } from 'asn1-ts';
import { prepareTimeStampCa, TimeStampVerificationError, verifyTimeStampResponse } from './TimeStampVerification';
import { verifyTimeStampResponse as verifySavedResponse } from './zamane';

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', 'timestamp-verification', name));
const original = fixture('original.txt');
const response = fixture('response.tsr');
const hash = createHash('sha256').update(original).digest();
const request = new DERElement();
request.fromBytes(fixture('request.tsq'));
const nonce = Buffer.from(request.sequence[2].value);

function changeResponse(change: (parsed: pkijs.TimeStampResp) => void): Buffer {
  const parsed = new pkijs.TimeStampResp({ schema: asn1js.fromBER(response).result });
  change(parsed);
  return Buffer.from(parsed.toSchema().toBER(false));
}

describe('RFC 3161 response verification', () => {
  it('verifies an externally supplied TSR through the public package API', async () => {
    const expected = { hashAlgorithm: 'SHA-256' as const, hash, nonce };
    await expect(verifySavedResponse(response, expected)).resolves.toBeUndefined();
    await expect(verifySavedResponse(response, { ...expected, ca: fixture('root.pem') })).resolves.toBeUndefined();
    const wrongNonce = Buffer.from(nonce);
    wrongNonce[0] ^= 1;
    await expect(verifySavedResponse(response, { ...expected, nonce: wrongNonce })).rejects.toThrow('nonce');
    await expect(
      verifySavedResponse(response, { ...expected, nonce: undefined as unknown as Uint8Array })
    ).rejects.toThrow('Original request nonce is required');
    await expect(verifySavedResponse(response, { ...expected, ca: fixture('other-root.pem') })).rejects.toThrow(
      TimeStampVerificationError
    );
  });

  it('verifies an offline signed response with and without a CA', async () => {
    await expect(verifyTimeStampResponse(response, hash, nonce, 'SHA-256')).resolves.toBeUndefined();
    await expect(
      verifyTimeStampResponse(response, hash, Buffer.concat([Buffer.from([0]), nonce]), 'SHA-256')
    ).resolves.toBeUndefined();
    const trustedCas = prepareTimeStampCa(fixture('root.pem'));
    await expect(verifyTimeStampResponse(response, hash, nonce, 'SHA-256', trustedCas)).resolves.toBeUndefined();
  });

  it('compares high-bit and leading-zero caller nonces as unsigned integers', async () => {
    const highBitRequest = new DERElement();
    highBitRequest.fromBytes(fixture('high-bit-request.tsq'));
    const unsignedNonce = Buffer.from(highBitRequest.sequence[2].value).subarray(1);
    expect(unsignedNonce[0] & 0x80).toBe(0x80);
    await expect(
      verifyTimeStampResponse(fixture('high-bit-response.tsr'), hash, unsignedNonce, 'SHA-256')
    ).resolves.toBeUndefined();
    await expect(
      verifyTimeStampResponse(
        fixture('high-bit-response.tsr'),
        hash,
        Buffer.concat([Buffer.from([0]), unsignedNonce]),
        'SHA-256'
      )
    ).resolves.toBeUndefined();
  });

  it('rejects an unrelated CA', async () => {
    const trustedCas = prepareTimeStampCa(fixture('other-root.pem'));
    await expect(verifyTimeStampResponse(response, hash, nonce, 'SHA-256', trustedCas)).rejects.toThrow(
      'does not chain to the supplied CA'
    );
  });

  it('does not trust a different certificate added to the token', async () => {
    const pem = fixture('unrelated-leaf.pem').toString('utf8');
    const der = Buffer.from(
      pem.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s/g, ''),
      'base64'
    );
    const unrelated = new pkijs.Certificate({ schema: asn1js.fromBER(der).result });
    const substituted = changeResponse((parsed) => {
      const signed = new pkijs.SignedData({ schema: parsed.timeStampToken!.content });
      signed.certificates!.push(unrelated);
      parsed.timeStampToken!.content = signed.toSchema();
    });
    const trustedCas = prepareTimeStampCa(fixture('other-root.pem'));
    await expect(verifyTimeStampResponse(substituted, hash, nonce, 'SHA-256', trustedCas)).rejects.toThrow(
      TimeStampVerificationError
    );
  });

  it('rejects wrong imprint, algorithm, and nonce', async () => {
    const wrongHash = Buffer.from(hash);
    wrongHash[0] ^= 1;
    await expect(verifyTimeStampResponse(response, wrongHash, nonce, 'SHA-256')).rejects.toThrow('imprint');
    await expect(verifyTimeStampResponse(response, hash, nonce, 'SHA-512')).rejects.toThrow('imprint');
    const wrongNonce = Buffer.from(nonce);
    wrongNonce[0] ^= 1;
    await expect(verifyTimeStampResponse(response, hash, wrongNonce, 'SHA-256')).rejects.toThrow('nonce');
  });

  it('rejects a failed status and modified CMS signature', async () => {
    const denied = changeResponse((parsed) => {
      parsed.status.status = 2;
    });
    await expect(verifyTimeStampResponse(denied, hash, nonce, 'SHA-256')).rejects.toThrow('did not grant');
    const altered = changeResponse((parsed) => {
      const signed = new pkijs.SignedData({ schema: parsed.timeStampToken!.content });
      signed.signerInfos[0].signature.valueBlock.valueHexView[0] ^= 1;
      parsed.timeStampToken!.content = signed.toSchema();
    });
    await expect(verifyTimeStampResponse(altered, hash, nonce, 'SHA-256')).rejects.toThrow('CMS signature');
  });

  it('rejects malformed responses and CA input', async () => {
    await expect(verifyTimeStampResponse(Buffer.from([1, 2, 3]), hash, nonce, 'SHA-256')).rejects.toThrow(
      TimeStampVerificationError
    );
    expect(() => prepareTimeStampCa('not a certificate')).toThrow('Invalid TSA CA certificate');
  });
});
