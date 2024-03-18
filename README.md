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


I'n theory this is just a basic implementation of RFC3161 but since there are some small changes 
necessary for Zamane to work, I've decided to create a separate package. See [ZamaneFix](src/utils/zamaneZdFix.ts) file for the details.

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

## License

ZamaneJS is licensed under the MIT License. See the `LICENSE` file for more details.
