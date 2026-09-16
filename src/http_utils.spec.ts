import { EventEmitter } from 'events';
import * as http from 'http';
import * as https from 'https';
import { tssRequest } from './http_utils';
import { TssRequestError } from './errors/TssRequestError';

jest.mock('http', () => ({ request: jest.fn() }));
jest.mock('https', () => ({ request: jest.fn() }));

describe('TSS HTTP transport', () => {
  const body = Buffer.from('synthetic request');
  let req: EventEmitter & { end: jest.Mock; destroy: jest.Mock };
  let respond: (res: http.IncomingMessage) => void;
  const openResponse = (status = 200, contentType = 'application/timestamp-reply') => {
    const res = Object.assign(new EventEmitter(), {
      statusCode: status,
      headers: { 'content-type': contentType },
      destroy: jest.fn()
    });
    respond(res as unknown as http.IncomingMessage);
    return res;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    req = Object.assign(new EventEmitter(), {
      end: jest.fn(),
      destroy: jest.fn((error: Error) => req.emit('error', error))
    });
    const request = (_url: unknown, _options: unknown, callback: (res: http.IncomingMessage) => void) => {
      respond = callback;
      return req as unknown as http.ClientRequest;
    };
    jest.mocked(http.request).mockImplementation(request as typeof http.request);
    jest.mocked(https.request).mockImplementation(request as typeof https.request);
  });

  afterEach(() => {
    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
  });

  it.each(['http', 'https'])(
    'passes Basic auth over %s and preserves binary response chunks',
    async (protocol) => {
      const pending = tssRequest(`${protocol}://tsa.example.test`, body, {
        authentication: { customerNo: '12345', customerPassword: 'test-only:password' }
      });
      const transport = protocol === 'https' ? https : http;
      expect(transport.request).toHaveBeenCalledWith(
        `${protocol}://tsa.example.test`,
        expect.objectContaining({
          auth: '12345:test-only:password',
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Length': body.length,
            'Content-Type': 'application/timestamp-query'
          })
        }),
        expect.any(Function)
      );
      expect(req.end).toHaveBeenCalledWith(body);
      const res = openResponse(200, 'Application/Timestamp-Reply; charset=binary');
      res.emit('data', Buffer.from([0x30, 0x03]));
      res.emit('data', Buffer.from([0x00, 0xff]));
      res.emit('end');
      await expect(pending).resolves.toEqual(Buffer.from([0x30, 0x03, 0x00, 0xff]));
    }
  );

  it('omits authentication when no credentials were provided', async () => {
    const pending = tssRequest('http://tsa.example.test', body);
    expect(jest.mocked(http.request).mock.calls[0][1]).not.toHaveProperty('auth');
    const res = openResponse();
    res.emit('data', body);
    res.emit('end');
    await expect(pending).resolves.toEqual(body);
  });

  it.each([301, 302, 401, 403, 429, 500, 503])('rejects HTTP %i without returning its body', async (status) => {
    const pending = tssRequest('https://tsa.example.test', body);
    const res = openResponse(status, 'application/json');
    await expect(pending).rejects.toMatchObject({ name: 'TssRequestError', statusCode: status });
    expect(res.destroy).toHaveBeenCalled();
    expect(https.request).toHaveBeenCalledTimes(1);
  });

  it.each(['application/json', 'text/html', 'application/octet-stream', ''])(
    'rejects unexpected media type %s',
    async (type) => {
      const pending = tssRequest('https://tsa.example.test', body);
      openResponse(200, type);
      await expect(pending).rejects.toThrow('Content-Type');
    }
  );

  it('rejects an empty response', async () => {
    const pending = tssRequest('https://tsa.example.test', body);
    openResponse().emit('end');
    await expect(pending).rejects.toThrow('empty');
  });

  it('rejects oversized responses', async () => {
    const pending = tssRequest('https://tsa.example.test', body);
    const res = openResponse();
    res.emit('data', Buffer.alloc(10 * 1024 * 1024 + 1));
    await expect(pending).rejects.toThrow('10 MiB');
    expect(res.destroy).toHaveBeenCalled();
  });

  it.each(['aborted', 'error'])('rejects interrupted response streams (%s)', async (event) => {
    const pending = tssRequest('https://tsa.example.test', body);
    const res = openResponse();
    res.emit('data', body);
    res.emit(event, new Error('test stream failure'));
    await expect(pending).rejects.toBeInstanceOf(TssRequestError);
  });

  it('rejects request errors and clears the deadline', async () => {
    const pending = tssRequest('https://tsa.example.test', body);
    req.emit('error', new Error('test connection error'));
    await expect(pending).rejects.toThrow('test connection error');
  });

  it('uses a 30 second default deadline', async () => {
    const pending = tssRequest('https://tsa.example.test', body);
    jest.advanceTimersByTime(30000);
    await expect(pending).rejects.toThrow('timed out');
    expect(req.destroy).toHaveBeenCalled();
  });

  it('enforces the total deadline even if response data keeps arriving', async () => {
    const pending = tssRequest('https://tsa.example.test', body, { timeoutMs: 50 });
    const res = openResponse();
    jest.advanceTimersByTime(40);
    res.emit('data', body);
    jest.advanceTimersByTime(10);
    await expect(pending).rejects.toThrow('timed out');
  });
});
