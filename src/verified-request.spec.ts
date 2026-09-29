import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { DERElement } from 'asn1-ts';
import { TimeStampRequest } from './TimeStampRequest';
import { Zamane } from './zamane';

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', 'timestamp-verification', name));
const reply = fixture('response.tsr');
const hash = createHash('sha256').update(fixture('original.txt')).digest();
const query = new DERElement();
query.fromBytes(fixture('request.tsq'));
const nonce = Buffer.from(query.sequence[2].value);

async function localTsa(): Promise<{ server: Server; client: Zamane; requestCount: () => number }> {
  let count = 0;
  const server = createServer((request, response) => {
    count++;
    request.resume();
    request.on('end', () => {
      response.writeHead(200, { 'Content-Type': 'application/timestamp-reply' });
      response.end(reply);
    });
  });
  await new Promise<void>((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  return {
    server,
    client: new Zamane({ hashAlgorithm: 'SHA-256', tssAddress: `http://127.0.0.1:${port}` }),
    requestCount: () => count
  };
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

describe('verified timestamp request', () => {
  it.each([undefined, fixture('root.pem')])(
    'returns the original Buffer only after verification with CA %p',
    async (ca) => {
      const tsa = await localTsa();
      try {
        const result = await tsa.client.timeStampRequest(hash, nonce, { ca });
        expect(Buffer.isBuffer(result)).toBe(true);
        expect(result).toEqual(reply);
        expect(tsa.requestCount()).toBe(1);
      } finally {
        await close(tsa.server);
      }
    }
  );

  it('verifies the automatically generated nonce', async () => {
    const generate = jest.spyOn(TimeStampRequest.prototype, 'generateNonce').mockReturnValue(nonce);
    const tsa = await localTsa();
    try {
      await expect(tsa.client.timeStampRequest(hash)).resolves.toEqual(reply);
    } finally {
      generate.mockRestore();
      await close(tsa.server);
    }
  });

  it('rejects a response bound to another nonce or hash', async () => {
    const tsa = await localTsa();
    try {
      const otherNonce = Buffer.from(nonce);
      otherNonce[0] ^= 1;
      await expect(tsa.client.timeStampRequest(hash, otherNonce)).rejects.toThrow('nonce');
      const otherHash = Buffer.from(hash);
      otherHash[0] ^= 1;
      await expect(tsa.client.timeStampRequest(otherHash, nonce)).rejects.toThrow('imprint');
      expect(tsa.requestCount()).toBe(2);
    } finally {
      await close(tsa.server);
    }
  });

  it('rejects malformed CA before sending a request', async () => {
    const tsa = await localTsa();
    try {
      await expect(tsa.client.timeStampRequest(hash, nonce, { ca: 'not a certificate' })).rejects.toThrow(
        'Invalid TSA CA certificate'
      );
      expect(tsa.requestCount()).toBe(0);
    } finally {
      await close(tsa.server);
    }
  });
});
