import { timingSafeEqual, webcrypto } from 'node:crypto';
import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import { HashingAlgorithm, oidForHashingAlgorithms } from './hashingAlgoritms';

const signedDataOid = '1.2.840.113549.1.7.2';
const tstInfoOid = '1.2.840.113549.1.9.16.1.4';
const contentTypeOid = '1.2.840.113549.1.9.3';
const messageDigestOid = '1.2.840.113549.1.9.4';
const signingCertificateOid = '1.2.840.113549.1.9.16.2.12';
const signingCertificateV2Oid = '1.2.840.113549.1.9.16.2.47';
const timeStampingEkuOid = '1.3.6.1.5.5.7.3.8';

export type TimeStampVerificationOptions = {
  /** Trusted TSA CA certificate(s), as PEM text/bundle or DER bytes. Omit to verify only the token signature. */
  ca?: string | Uint8Array;
};

export class TimeStampVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeStampVerificationError';
  }
}

function fail(message: string): never {
  throw new TimeStampVerificationError(message);
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

function unsignedInteger(bytes: Uint8Array): bigint {
  if (!bytes.length) fail('Timestamp nonce is empty');
  return bytes.reduce((value, byte) => value * BigInt(256) + BigInt(byte), BigInt(0));
}

function positiveDerInteger(bytes: Uint8Array): bigint {
  if (!bytes.length || (bytes[0] & 0x80) !== 0) fail('Timestamp nonce is not a positive INTEGER');
  return unsignedInteger(bytes);
}

function parseCertificate(bytes: Uint8Array): pkijs.Certificate {
  const parsed = asn1js.fromBER(bytes);
  if (parsed.offset !== bytes.length) fail('Invalid TSA CA certificate');
  try {
    return new pkijs.Certificate({ schema: parsed.result });
  } catch {
    return fail('Invalid TSA CA certificate');
  }
}

/** Parse CA input before making a network request, so a malformed CA does not consume a TSA operation. */
export function prepareTimeStampCa(ca?: string | Uint8Array): pkijs.Certificate[] | undefined {
  if (ca === undefined) return undefined;
  if (typeof ca !== 'string' && !(ca instanceof Uint8Array)) fail('CA must be PEM text or DER bytes');
  const bytes = typeof ca === 'string' ? Buffer.from(ca, 'utf8') : Buffer.from(ca);
  if (!bytes.length) fail('CA certificate is empty');
  const pem = bytes.toString('utf8');
  if (!pem.trimStart().startsWith('-----BEGIN CERTIFICATE-----')) return [parseCertificate(bytes)];
  const blocks = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);
  if (!blocks?.length || pem.replace(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g, '').trim()) {
    fail('Invalid PEM CA certificate');
  }
  return blocks.map((block) => {
    const base64 = block.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----/g, '').replace(/\s/g, '');
    if (!base64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) fail('Invalid PEM CA certificate');
    return parseCertificate(Buffer.from(base64, 'base64'));
  });
}

function getAttribute(signer: pkijs.SignerInfo, oid: string): pkijs.Attribute | undefined {
  const matches = signer.signedAttrs?.attributes.filter((attribute) => attribute.type === oid) ?? [];
  if (matches.length > 1) fail('Timestamp has duplicate signed attributes');
  return matches[0];
}

function oneValue(attribute: pkijs.Attribute | undefined, name: string): asn1js.BaseBlock {
  if (!attribute || attribute.values.length !== 1) fail(`Timestamp is missing ${name}`);
  return attribute.values[0];
}

function signerCertificate(signed: pkijs.SignedData, signer: pkijs.SignerInfo): pkijs.Certificate {
  const certificates =
    signed.certificates?.filter(
      (certificate): certificate is pkijs.Certificate => certificate instanceof pkijs.Certificate
    ) ?? [];
  const matches = certificates.filter((certificate) => {
    if (signer.sid instanceof pkijs.IssuerAndSerialNumber) {
      return (
        certificate.issuer.isEqual(signer.sid.issuer) && certificate.serialNumber.isEqual(signer.sid.serialNumber)
      );
    }
    if (signer.sid instanceof asn1js.Primitive) {
      const keyId = signer.sid.valueBlock.valueHexView;
      const subjectKeyId = certificate.extensions?.find((extension) => extension.extnID === '2.5.29.14');
      return (
        subjectKeyId?.parsedValue instanceof asn1js.OctetString &&
        equalBytes(keyId, subjectKeyId.parsedValue.valueBlock.valueHexView)
      );
    }
    return false;
  });
  if (matches.length !== 1) fail('Timestamp signer certificate is missing or ambiguous');
  return matches[0];
}

function checkSignerPurpose(certificate: pkijs.Certificate, generationTime: Date): void {
  const eku = certificate.extensions?.find((extension) => extension.extnID === '2.5.29.37');
  if (
    !eku?.critical ||
    !(eku.parsedValue instanceof pkijs.ExtKeyUsage) ||
    eku.parsedValue.keyPurposes.length !== 1 ||
    eku.parsedValue.keyPurposes[0] !== timeStampingEkuOid
  ) {
    fail('Timestamp signer certificate lacks critical timeStamping-only usage');
  }
  const keyUsage = certificate.extensions?.find((extension) => extension.extnID === '2.5.29.15');
  if (keyUsage) {
    const bits = keyUsage.parsedValue;
    // RFC 5280 permits digitalSignature and/or contentCommitment for time stamping.
    if (
      !(bits instanceof asn1js.BitString) ||
      !bits.valueBlock.valueHexView.length ||
      (bits.valueBlock.valueHexView[0] & 0xc0) === 0
    ) {
      fail('Timestamp signer certificate KeyUsage forbids signing');
    }
  }
  if (
    !Number.isFinite(generationTime.getTime()) ||
    generationTime < certificate.notBefore.value ||
    generationTime > certificate.notAfter.value
  ) {
    fail('Timestamp signer certificate was not valid at generation time');
  }
}

async function checkEssCertificate(
  signer: pkijs.SignerInfo,
  certificate: pkijs.Certificate,
  crypto: pkijs.CryptoEngine
): Promise<void> {
  const attributes = [
    getAttribute(signer, signingCertificateOid),
    getAttribute(signer, signingCertificateV2Oid)
  ].filter((attribute): attribute is pkijs.Attribute => attribute !== undefined);
  if (!attributes.length) fail('Timestamp is missing the SigningCertificate attribute');
  for (const attribute of attributes) {
    const value = oneValue(attribute, 'SigningCertificate attribute');
    if (!(value instanceof asn1js.Sequence)) fail('Invalid SigningCertificate attribute');
    const certs = value.valueBlock.value[0];
    if (!(certs instanceof asn1js.Sequence) || !certs.valueBlock.value.length) {
      fail('Invalid SigningCertificate certificate list');
    }
    const first = certs.valueBlock.value[0];
    if (!(first instanceof asn1js.Sequence)) fail('Invalid SigningCertificate identifier');
    const fields = first.valueBlock.value;
    let algorithm = attribute.type === signingCertificateOid ? 'SHA-1' : 'SHA-256';
    let hashIndex = 0;
    if (attribute.type === signingCertificateV2Oid && fields[0] instanceof asn1js.Sequence) {
      const oid = fields[0].valueBlock.value[0];
      if (!(oid instanceof asn1js.ObjectIdentifier)) fail('Invalid SigningCertificate hash algorithm');
      algorithm = crypto.getAlgorithmByOID(oid.valueBlock.toString(), true).name;
      hashIndex = 1;
    }
    if (fields.length < hashIndex + 1 || fields.length > hashIndex + 2) {
      fail('Invalid SigningCertificate identifier fields');
    }
    const certHash = fields[hashIndex];
    if (!(certHash instanceof asn1js.OctetString)) fail('Invalid SigningCertificate hash');
    const actual = new Uint8Array(await crypto.digest(algorithm, certificate.toSchema().toBER(false)));
    if (!equalBytes(actual, certHash.valueBlock.valueHexView))
      fail('Timestamp signer certificate does not match ESS identifier');

    if (fields.length === hashIndex + 2) {
      const schema = fields[hashIndex + 1];
      if (!(schema instanceof asn1js.Sequence) || schema.valueBlock.value.length !== 2) {
        fail('Invalid ESS issuerSerial');
      }
      let issuerSerial: pkijs.IssuerSerial;
      try {
        issuerSerial = new pkijs.IssuerSerial({ schema });
      } catch {
        return fail('Invalid ESS issuerSerial');
      }
      const names = issuerSerial.issuer.names;
      if (
        names.length !== 1 ||
        names[0].type !== 4 ||
        !(names[0].value instanceof pkijs.RelativeDistinguishedNames) ||
        !names[0].value.isEqual(certificate.issuer) ||
        !issuerSerial.serialNumber.isEqual(certificate.serialNumber)
      ) {
        fail('Timestamp ESS issuerSerial does not match signer certificate');
      }
    }
  }
}

async function verifyTimeStampResponseInner(
  responseBytes: Uint8Array,
  expectedHash: Uint8Array,
  expectedNonce: Uint8Array,
  hashAlgorithm: HashingAlgorithm,
  trustedCas?: pkijs.Certificate[]
): Promise<void> {
  const crypto = new pkijs.CryptoEngine({
    name: 'node:crypto',
    crypto: webcrypto as unknown as ConstructorParameters<typeof pkijs.CryptoEngine>[0]['crypto']
  });
  let response: pkijs.TimeStampResp;
  try {
    const parsed = asn1js.fromBER(responseBytes);
    if (parsed.offset !== responseBytes.length) fail('Invalid timestamp response DER');
    response = new pkijs.TimeStampResp({ schema: parsed.result });
  } catch {
    return fail('Invalid timestamp response DER');
  }
  if (response.status.status !== 0 && response.status.status !== 1)
    fail('TSA did not grant the timestamp request');
  if (!response.timeStampToken || response.timeStampToken.contentType !== signedDataOid) {
    fail('Timestamp response has no CMS SignedData token');
  }

  let signed: pkijs.SignedData;
  let info: pkijs.TSTInfo;
  let content: Uint8Array;
  try {
    signed = new pkijs.SignedData({ schema: response.timeStampToken.content });
    if (signed.encapContentInfo.eContentType !== tstInfoOid || !signed.encapContentInfo.eContent) {
      fail('Timestamp token does not contain TSTInfo');
    }
    content = new Uint8Array(signed.encapContentInfo.eContent.getValue());
    info = pkijs.TSTInfo.fromBER(content);
  } catch {
    return fail('Invalid timestamp token');
  }
  if (
    info.version !== 1 ||
    info.messageImprint.hashAlgorithm.algorithmId !== oidForHashingAlgorithms[hashAlgorithm] ||
    !equalBytes(info.messageImprint.hashedMessage.valueBlock.valueHexView, expectedHash)
  ) {
    fail('Timestamp message imprint does not match the request hash');
  }
  if (!info.nonce || positiveDerInteger(info.nonce.valueBlock.valueHexView) !== unsignedInteger(expectedNonce)) {
    fail('Timestamp nonce does not match the request');
  }
  if (signed.signerInfos.length !== 1) fail('Timestamp token must have exactly one signer');
  const signer = signed.signerInfos[0];
  if (!signer.signedAttrs) fail('Timestamp signer has no signed attributes');
  const certificate = signerCertificate(signed, signer);
  checkSignerPurpose(certificate, info.genTime);
  await checkEssCertificate(signer, certificate, crypto);

  const contentType = oneValue(getAttribute(signer, contentTypeOid), 'content-type attribute');
  if (!(contentType instanceof asn1js.ObjectIdentifier) || contentType.valueBlock.toString() !== tstInfoOid) {
    fail('Timestamp signed content type is invalid');
  }
  const messageDigest = oneValue(getAttribute(signer, messageDigestOid), 'message-digest attribute');
  if (!(messageDigest instanceof asn1js.OctetString)) fail('Timestamp signed digest is invalid');
  const digestAlgorithm = crypto.getAlgorithmByOID(signer.digestAlgorithm.algorithmId, true).name;
  const contentDigest = new Uint8Array(await crypto.digest(digestAlgorithm, content));
  if (!equalBytes(contentDigest, messageDigest.valueBlock.valueHexView))
    fail('Timestamp signed content digest is invalid');
  if (
    !(await crypto.verifyWithPublicKey(
      signer.signedAttrs.encodedValue,
      signer.signature,
      certificate.subjectPublicKeyInfo,
      signer.signatureAlgorithm,
      digestAlgorithm
    ))
  ) {
    fail('Timestamp CMS signature is invalid');
  }

  if (trustedCas) {
    const certificates =
      signed.certificates?.filter((item): item is pkijs.Certificate => item instanceof pkijs.Certificate) ?? [];
    const chain = new pkijs.CertificateChainValidationEngine({
      certs: [...certificates.filter((item) => item !== certificate), certificate],
      trustedCerts: trustedCas,
      checkDate: info.genTime
    });
    // Revocation data is not fetched or required by this library.
    const result = await chain.verify({ passedWhenNotRevValues: true }, crypto);
    if (
      !result.result ||
      !result.certificatePath?.length ||
      !equalBytes(
        new Uint8Array(result.certificatePath[0].toSchema().toBER(false)),
        new Uint8Array(certificate.toSchema().toBER(false))
      )
    ) {
      fail('Timestamp signer certificate does not chain to the supplied CA');
    }
  }
}

/** Verify an RFC 3161 response before exposing it as a successful timestamp. */
export async function verifyTimeStampResponse(
  responseBytes: Uint8Array,
  expectedHash: Uint8Array,
  expectedNonce: Uint8Array,
  hashAlgorithm: HashingAlgorithm,
  trustedCas?: pkijs.Certificate[]
): Promise<void> {
  try {
    await verifyTimeStampResponseInner(responseBytes, expectedHash, expectedNonce, hashAlgorithm, trustedCas);
  } catch (error) {
    if (error instanceof TimeStampVerificationError) throw error;
    fail('Invalid timestamp response or unsupported cryptographic algorithm');
  }
}
