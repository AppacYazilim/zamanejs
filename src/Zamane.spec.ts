import { ZamaneCredentials } from './credentials';
import { Zamane } from './zamane';
import { HashLengthError } from './errors/HashLengthError';
import { tssRequest } from './http_utils';
import { DERElement } from 'asn1-ts';

jest.mock('./http_utils', () => ({ tssRequest: jest.fn() }));
const send = jest.mocked(tssRequest);
const credentials = {
  hashAlgorithm: 'SHA-256',
  tssAddress: 'http://tsa.example.test'
} satisfies ZamaneCredentials;

describe('Zamane requests', () => {
  beforeEach(() => send.mockReset());

  it.each(['http', 'https'])('passes credentials and the requested hash over %s', async (protocol) => {
    const client = new Zamane({
      ...credentials,
      tssAddress: `${protocol}://tsa.example.test`,
      customerNo: '12345',
      customerPassword: 'test-only:password',
      requestTimeoutMs: 1500
    });
    const hash = await client.hashFromString('Synthetic test document');
    const response = Buffer.from('transport test response');
    send.mockResolvedValue(response);
    expect(await client.timeStampRequest(hash)).toBe(response);
    expect(send).toHaveBeenCalledWith(`${protocol}://tsa.example.test`, expect.any(Buffer), {
      authentication: { customerNo: '12345', customerPassword: 'test-only:password' },
      timeoutMs: 1500
    });
    const request = new DERElement();
    request.fromBytes(send.mock.calls[0][1]);
    expect(Buffer.from(request.sequence[1].sequence[1].octetString)).toEqual(hash);
    expect(request.sequence[2].integer).toBeDefined();
  });

  it('keeps unauthenticated servers supported', async () => {
    const client = new Zamane(credentials);
    send.mockResolvedValue(Buffer.from('test response'));
    await client.timeStampRequest(await client.hashFromString('test'));
    expect(send.mock.calls[0][2]?.authentication).toBeUndefined();
  });

  it('propagates transport failures', async () => {
    const client = new Zamane(credentials);
    send.mockRejectedValue(new Error('TSS request failed with HTTP 401'));
    await expect(client.timeStampRequest(await client.hashFromString('test'))).rejects.toThrow('HTTP 401');
  });

  it('rejects invalid hash lengths before sending', async () => {
    await expect(new Zamane(credentials).timeStampRequest(new Uint8Array(64))).rejects.toThrow(HashLengthError);
    expect(send).not.toHaveBeenCalled();
  });

  it.each([
    { customerNo: '12345' },
    { customerPassword: 'test-only' },
    { customerNo: '', customerPassword: 'test-only' },
    { customerNo: '12345', customerPassword: '' },
    { customerNo: '123:45', customerPassword: 'test-only' }
  ])('rejects incomplete or invalid credentials from JS callers: %j', (authentication) => {
    expect(() => new Zamane({ ...credentials, ...authentication } as ZamaneCredentials)).toThrow('HTTP Basic');
  });

  it.each([0, -1, 0.5, NaN, Infinity, 2147483648])('rejects invalid timeout %s', (requestTimeoutMs) => {
    expect(() => new Zamane({ ...credentials, requestTimeoutMs })).toThrow('requestTimeoutMs');
  });
});
