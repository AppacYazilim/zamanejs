# ZameneJS

This package is only tested to work with Linux and macos. PR's welcome for other OS'es!

## Zamane

Zamane is an app written by TUBITAK for Turkish goverment that creates timestamps for given files. These timestamps could be used in court to prove as evidence that file or document existed at the claimed time.  

ZamaneJS is a wrapper around [Zamane](https://kamusm.bilgem.tubitak.gov.tr/urunler/zaman_damgasi/ucretsiz_zaman_damgasi_istemci_yazilimi.jsp). 
This package downloads cli jar from `https://kamusm.bilgem.tubitak.gov.tr/urunler/zaman_damgasi/dosyalar/tss-client-console-3.1.17.zip` and unzips the jar file to `/tmp/zamanejs/zamane.jar` 

## Install

You can use `npm` or `yarn` to use this package on your nodejs project. **This package cannot run in browsers!**

- Run `yarn add zamanejs` or `npm i zamanejs` on your projects root. 
- Install openjdk on your machine or your container. Make sure `java` is available on your `$PATH`

> Beware that running zamane methods in this package will result in creation of tmp files under `/tmp/zamane` and a jar file will be downloaded to this folder. 

## Legal

This package is just a wrapper around goverment agets provided program and we do not guarantee if our wrapper library works 100%. Please check LICENSE file for more. 

## Credentials

You need to buy credits in order to timestamp files. But for development and testing purposes you can request sample credentials from TUBITAK. 

quoted from [source](https://kamusm.bilgem.tubitak.gov.tr/urunler/zaman_damgasi/ucretsiz_zaman_damgasi_istemci_yazilimi.jsp)
> Zamane test kullanıcısı talep etmek amacıyla Kamu SM (bilgi[at]kamusm.gov.tr)'ye e-posta gönderilmesi gerekmektedir. İlgili e-posta'nın konu kısmında "Zamane test kullanıcı talebi", içeriğinde ise "Kurum adı, kurum vergi kimlik numarası, kurum adresi, kurum sabit telefon, yetkili kişi adı ve soyadı, cep telefonu numarası, yetkili kişi e-posta" bilgilerinin ve Sha-256 veya Sha-512 özet algoritmasından hangisinin istendiğinin yer alması gerekmektedir.

translation
> In order to request a time test user, an e-mail should be sent to Kamu SM (bilgi[at]kamusm.gov.tr). "Time test user request" in the subject part of the relevant e-mail, and in the content, "Institution name, corporate tax identification number, institution address, corporate landline phone, authorized person name and surname, mobile phone number, authorized person e-mail" information. and whether Sha-256 or Sha-512 hash algorithm is desired.

please not Kamu SM might require an email written in turkish! 

### How to get legit credentials

Here are the list of issuers for paid credentials. (not the full list or the offical list)
- https://tssuser.e-imzatr.com.tr:8027/
- https://zdportal.kamusm.gov.tr/

> you can open a pr if you'd like to add an issuer to list

### Example Credential

```typescript
const zamene = new Zamane({
  tssAddress: 'http://tzd.kamusm.gov.tr', // goverments sample timestamp server
  tssPort: '80',
  customerNo: '00000', // your customer number. only contains digits
  customerPassword: 'a1b2c3d4', // your customer password
});
```

## How To Use

### Checking remaining credit
After initialising the zamane object with credentials (example above) you can call the checkCredit method. This method will return a promise with the number of credits remaining in your account. 
```typescript
zamene.checkCredit().then(credit => {
  console.log("Available Credit", credit);
});
```

### Timestamping a file

When you give a file to timestamp to method `stampFile`, the stamp file location is going to be file with `.zd` at the end. 

```typescript
zamene.stampFile("example.txt").then(stampLocation => { // timestamp file will be generated at example.txt.zd
  console.log("Timestamp File Location: ", stampLocation);
});
```

### Timestamping a string

This method creates a temp file at `/tmp/zamanejs` and timestamps that file, after stamping reads the stamp as string then deletes all the temp files generated. 

This method is usefull if you want to store timestamp values on your database. Please note that timestamp data's are not ascii files. Please prepare your scema accordingly.  

```typescript
zamene.stampContents("Test Contents").then(stamp => {
  console.log("Stamp Result", stamp);
});
```

### Checking timestamp of file

Normaly timestamp is added next to files with addition of `.zd` extension.  on the `checkStampOfFile` method if the second argument is not given, the timestamp file location will be assumed to be at file location with `.zd` at the end. 

```typescript
zamene.checkStampOfFile('example.txt').then(isValid => {
  console.log("Timestamp Validity: ", isValid);
});
```

### Checking timestamp of string

```typescript
zamene.checkStampOfContents('Test Contents', timeStampContents).then(isValid => {
  console.log("Timestamp Validity: ", isValid);
});
```

