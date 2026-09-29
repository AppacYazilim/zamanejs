import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import { ASN1UniversalType, DERElement } from 'asn1-ts';
import { Zamane } from './zamane';

// This suite inspects the outgoing DER and HTTP transport; signed replies are covered separately.
jest.mock('./TimeStampVerification', () => ({
  ...jest.requireActual('./TimeStampVerification'),
  verifyTimeStampResponse: jest.fn().mockResolvedValue(undefined)
}));

const timestampReply = Buffer.from([0x30, 0x05, 0x30, 0x03, 0x02, 0x01, 0x00]);

describe('nonce over a local HTTP TSA', () => {
  it.each([
    { nonce: Buffer.from('8000000000000001', 'hex') },
    { nonce: new Uint8Array(32).fill(0x5a) },
    { nonce: undefined }
  ])('sends a valid RFC 3161 request with nonce $nonce', async ({ nonce }) => {
    let receiveRequest: (body: Buffer) => void;
    const received = new Promise<Buffer>((resolve) => {
      receiveRequest = resolve;
    });
    const server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        expect(req.method).toBe('POST');
        expect(req.headers['content-type']).toBe('application/timestamp-query');
        receiveRequest(Buffer.concat(chunks));
        res.writeHead(200, { 'Content-Type': 'application/timestamp-reply' });
        res.end(timestampReply);
      });
    });

    try {
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const address = server.address() as AddressInfo;
      const client = new Zamane({ hashAlgorithm: 'SHA-256', tssAddress: `http://127.0.0.1:${address.port}` });
      const hash = await client.hashFromString('Synthetic payroll evidence');
      const reply = await client.timeStampRequest(hash, nonce);
      const request = new DERElement();
      request.fromBytes(await received);

      expect(Buffer.isBuffer(reply)).toBe(true);
      expect(reply).toEqual(timestampReply);
      expect(request.sequence[0].integer).toBe(1);
      expect(request.sequence[1].sequence[0].sequence[0].objectIdentifier.toString()).toBe(
        '2.16.840.1.101.3.4.2.1'
      );
      expect(Buffer.from(request.sequence[1].sequence[1].octetString)).toEqual(hash);
      expect(request.sequence[2].tagNumber).toBe(ASN1UniversalType.integer);
      expect(BigInt(request.sequence[2].integer)).toBeGreaterThanOrEqual(BigInt(0));
      if (nonce) {
        expect(BigInt(request.sequence[2].integer)).toBe(BigInt('0x' + Buffer.from(nonce).toString('hex')));
      } else {
        expect(request.sequence[2].value.length).toBeGreaterThan(0);
      }
      expect(request.sequence[3].boolean).toBe(true);
    } finally {
      if (server.listening) {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    }
  });
});
