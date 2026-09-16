import * as https from 'https';
import * as http from 'http';
import { TssRequestError } from './errors/TssRequestError';

type TssRequestOptions = {
  authentication?: { customerNo: string; customerPassword: string };
  timeoutMs?: number;
};

export async function tssRequest(url: string, body: Buffer, options: TssRequestOptions = {}): Promise<Buffer> {
  const protocol = url.startsWith('https') ? https : http;

  return new Promise((resolve, reject) => {
    // Cover the entire request, including connection stalls and slowly trickling responses.
    const fail = (error: Error) => {
      clearTimeout(timer);
      reject(error);
    };
    const req = protocol.request(
      url,
      {
        method: 'POST',
        ...(options.authentication
          ? { auth: `${options.authentication.customerNo}:${options.authentication.customerPassword}` }
          : {}),
        headers: {
          Accept: 'application/timestamp-reply',
          'Content-Type': 'application/timestamp-query',
          'Content-Length': body.length
        }
      },
      (res) => {
        const status = res.statusCode;
        res.on('error', () => fail(new TssRequestError('TSS response stream failed', status)));
        res.on('aborted', () => fail(new TssRequestError('TSS response was interrupted', status)));
        if (status !== 200) {
          fail(new TssRequestError(`TSS request failed with HTTP ${status ?? 'unknown'}`, status));
          res.destroy();
          return;
        }
        const contentType = res.headers['content-type']?.split(';')[0].trim().toLowerCase();
        if (contentType !== 'application/timestamp-reply') {
          fail(new TssRequestError('TSS response must have Content-Type application/timestamp-reply', status));
          res.destroy();
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > 10 * 1024 * 1024) {
            fail(new TssRequestError('TSS response exceeds the 10 MiB limit', status));
            res.destroy();
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => {
          clearTimeout(timer);
          if (size === 0) {
            fail(new TssRequestError('TSS response is empty', status));
            return;
          }
          resolve(Buffer.concat(chunks));
        });
      }
    );

    req.on('error', fail);
    const timer = setTimeout(() => {
      req.destroy(new TssRequestError('TSS request timed out'));
    }, options.timeoutMs ?? 30000);
    req.end(body);
  });
}
