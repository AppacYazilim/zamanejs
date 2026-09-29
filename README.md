# ZamaneJS
ZamaneJS is a JavaScript implementation of the Zamane timestamping service. It provides a simple and easy-to-use API for interacting with the Zamane service.

[![Jest](https://github.com/AppacYazilim/zamanejs/actions/workflows/tests.yml/badge.svg?branch=main&event=push)](https://github.com/AppacYazilim/zamanejs/actions/workflows/tests.yml)
[![npm](https://img.shields.io/npm/v/zamanejs)](https://www.npmjs.com/package/zamanejs)
[![npm](https://img.shields.io/npm/dt/zamanejs)](https://www.npmjs.com/package/zamanejs)

[![GitHub issues](https://img.shields.io/github/issues/AppacYazilim/zamanejs)](https://github.com/AppacYazilim/zamanejs/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/AppacYazilim/zamanejs)](https://github.com/AppacYazilim/zamanejs/pulls)
[![GitHub](https://img.shields.io/github/license/AppacYazilim/zamanejs)](https://github.com/AppacYazilim/zamanejs/blob/main/LICENSE)

[![GitHub watchers](https://img.shields.io/github/watchers/AppacYazilim/zamanejs?style=social)](https://github.com/AppacYazilim/zamanejs/watchers)
[![GitHub Repo stars](https://img.shields.io/github/stars/AppacYazilim/zamanejs?style=social)](https://github.com/AppacYazilim/zamanejs/stargazers)


## Zamane

Zamane is an app written by TUBITAK for Turkish goverment that creates timestamps for given files. These timestamps could be used in court to prove as evidence that file or document existed at the claimed time.  

## Legal

This package is not affiliated with TUBITAK. It is an open-source project and is not responsible for any legal issues that may arise from the use of this package. It is the responsibility of the user to ensure that the use of this package complies with the laws of the country in which it is used.

## Contact

For any questions or suggestions, you can contact me at [my email](mailto:info@appac.ltd). 
Please include [zamane] in the subject line.

## Features

- Pure JavaScript implementation, no external cli dependencies required.
- Provides methods for hashing files and strings, requesting timestamps, and validating timestamps.
- Supports both file-based and string-based timestamping.

## Installation

You can install ZamaneJS using npm or yarn:

```bash
npm install zamanejs
# or
yarn add zamanejs
```
## Credentials

You need to buy credits in order to timestamp files. But for development and testing purposes you can request sample credentials from TUBITAK.

quoted from [source](https://kamusm.bilgem.tubitak.gov.tr/urunler/zaman_damgasi/ucretsiz_zaman_damgasi_istemci_yazilimi.jsp)
> Zamane test kullanıcısı talep etmek amacıyla Kamu SM (bilgi[at]kamusm.gov.tr)'ye e-posta gönderilmesi gerekmektedir. İlgili e-posta'nın konu kısmında "Zamane test kullanıcı talebi", içeriğinde ise "Kurum adı, kurum vergi kimlik numarası, kurum adresi, kurum sabit telefon, yetkili kişi adı ve soyadı, cep telefonu numarası, yetkili kişi e-posta" bilgilerinin ve Sha-256 veya Sha-512 özet algoritmasından hangisinin istendiğinin yer alması gerekmektedir.

translation
> In order to request a time test user, an e-mail should be sent to Kamu SM (bilgi[at]kamusm.gov.tr). "Time test user request" in the subject part of the relevant e-mail, and in the content, "Institution name, corporate tax identification number, institution address, corporate landline phone, authorized person name and surname, mobile phone number, authorized person e-mail" information. and whether Sha-256 or Sha-512 hash algorithm is desired.

please note that Kamu SM might require an email written in Turkish!

### How to get real credentials

Here are the list of issuers for paid credentials. (not the full list or the offical list)
- https://e-tugra.com.tr/zaman-damgasi/
- https://tssuser.e-imzatr.com.tr:8027/
- https://zdportal.kamusm.gov.tr/

## Usage

First, import the `Zamane` class and create a new instance with your credentials:

```javascript
import { Zamane } from 'zamanejs';

const zamane = new Zamane({
  tssAddress: 'http://tzd.kamusm.gov.tr', // goverments sample timestamp server
  hashAlgorithm: 'SHA-256', // the hash algorithm to use. either 'SHA-256' or 'SHA-512'
  customerNo: '00000', // your customer number. only contains digits, if not required don't pass it
  customerPassword: 'a1b2c3d4', // your customer password, if not required don't pass it
});
```

### Hashing a file

You can hash a file using the `hashFromPath` method:

```javascript
zamane.hashFromPath("example.txt").then(hash => {
  console.log("File Hash: ", hash);
});
```

### Hashing a string

You can hash a string using the `hashFromString` method:

```javascript
zamane.hashFromString("Test Contents").then(hash => {
  console.log("String Hash: ", hash);
});
```

### Requesting a timestamp

You can request a timestamp using the `timeStampRequest` method:

```javascript
const hash = await zamane.hashFromString("Test Contents");
zamane.timeStampRequest(hash).then(timestamp => {
  console.log("Timestamp: ", timestamp);
});
```

To save the nonce before contacting the TSA, pass 8 to 32 bytes as the optional
second argument:

```javascript
import { randomBytes } from 'node:crypto';

const nonce = randomBytes(16);
await saveNonce(nonce); // Persist it with the document hash before the request.
const timestamp = await zamane.timeStampRequest(hash, nonce);
// The returned response has already passed the nonce, imprint and signature checks.
```

`Buffer` and `Uint8Array` are accepted. The nonce is an unsigned RFC 3161
INTEGER: DER removes redundant leading zero bytes and adds a sign byte when
needed. Compare decoded integer values if the supplied bytes begin with zero.
Without a nonce argument, ZamaneJS continues to generate one automatically and
checks that same nonce in the reply. The method still returns the raw response
as a `Buffer`.

### Timestamp verification and optional CA

`timeStampRequest` returns only after checking the RFC 3161 status, SHA-256 or
SHA-512 message imprint, nonce, CMS signature, signer certificate binding, and
the signer's critical time-stamping usage. Failed checks reject with
`TimeStampVerificationError`.

Supply a trusted TSA CA certificate to also require a valid certificate chain:

```javascript
import { readFileSync } from 'node:fs';

const ca = readFileSync('trusted-tsa-root.pem');
const timestamp = await zamane.timeStampRequest(hash, nonce, { ca });
```

`ca` accepts PEM text, a PEM certificate bundle, or DER bytes. The CA is
optional; without it the token's cryptographic signature is checked against its
embedded signer certificate, but the signer's identity is **not trusted**.
Provision CA certificates from an independently trusted source. Revocation
status is not fetched or checked automatically, and applications must decide
whether the TSA policy and timestamp time are acceptable for their evidence.

### Verifying a timestamp file received from elsewhere

An existing `.tsr` file can be checked offline without a `Zamane` instance, TSA
credentials, or a new timestamp request. Use the **exact original file bytes**,
the hash algorithm used in the request, and the nonce saved when that request
was sent:

```javascript
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { verifyTimeStampResponse } from 'zamanejs';

const original = readFileSync('document.pdf');
const tsr = readFileSync('received.tsr');
const nonce = readFileSync('request-nonce.bin'); // Nonce from the original request.
const hash = createHash('sha256').update(original).digest();

await verifyTimeStampResponse(tsr, {
  hashAlgorithm: 'SHA-256',
  hash,
  nonce,
  ca: readFileSync('trusted-tsa-root.pem')
});
// Resolves only when the response and its signer chain pass verification.
```

If you only need the cryptographic checks and do not have a trusted CA, omit
`ca`:

```javascript
await verifyTimeStampResponse(tsr, { hashAlgorithm: 'SHA-256', hash, nonce });
```

Without `ca`, signer identity is not trusted. Obtain the expected nonce from
the original request or its saved metadata; copying a nonce out of the `.tsr`
itself cannot prove that the response belongs to your request. Verification
fails if the expected nonce is missing or does not match. This API does not
contact the TSA or check certificate revocation.

### Authentication and transport errors

When supplied, `customerNo` and `customerPassword` are sent using HTTP Basic
authentication. Omit both for an unauthenticated TSA. This authentication scheme
must be supported by your provider; it is not a provider-specific Zamane identity
token. Both HTTP and HTTPS are supported. Prefer HTTPS when available: Basic
authentication over HTTP does not encrypt the credentials.

`requestTimeoutMs` optionally sets a total request deadline (default: 30000 ms).
`timeStampRequest` rejects non-200 responses, unexpected or missing
`application/timestamp-reply` content types, empty responses, responses over
10 MiB, and interrupted or timed-out requests. Redirects are not followed.
Transport response errors are exported as `TssRequestError`, with `statusCode`
when available. Errors do not include the response body or credentials.

The returned Buffer contains the original RFC 3161 response bytes. Supplying
`ca` is necessary when the application requires a trusted TSA identity.

## License

ZamaneJS is licensed under the MIT License. See the `LICENSE` file for more details.
