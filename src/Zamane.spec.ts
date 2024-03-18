import { ZamaneCredentials } from './credentials';
import { Zamane } from './zamane';

describe('Zamane Tests', () => {
  it('should request a timestamp', async () => {
    const content = 'Hello, World!';

    const credentials = {
      hashAlgorithm: 'SHA-256',
      tssAddress: 'http://tsa.e-tugra.com' // for testing this server does not require credentials for some reason.
    } satisfies ZamaneCredentials;

    const zamane = new Zamane(credentials);

    const hash = await zamane.hashFromString(content);

    const timestamp = await zamane.timeStampRequest(hash);

    expect(timestamp).toBeDefined();

    // TODO: Validate the timestamp
  });

  it('should error on invalid server', async () => {
    const content = 'Hello, World!';

    const credentials = {
      hashAlgorithm: 'SHA-256',
      tssAddress: 'http://invalidserverplzdontregisterthisdomain.com'
    } satisfies ZamaneCredentials;

    const zamane = new Zamane(credentials);

    const hash = await zamane.hashFromString(content);

    const timestampPromise = zamane.timeStampRequest(hash);

    await expect(timestampPromise).rejects.toThrow();
  });
});
