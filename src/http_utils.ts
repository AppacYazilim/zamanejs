import * as https from 'https';
import * as http from 'http';

export async function tssRequest(url: string, body: Buffer): Promise<Buffer> {
  const protocol = url.startsWith('https') ? https : http;

  return new Promise((resolve, reject) => {
    const req = protocol.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/timestamp-query',
          'Content-Length': body.length
        }
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }
    );

    req.on('error', (error) => reject(error));
    req.write(body);
    req.end();
  });
}
