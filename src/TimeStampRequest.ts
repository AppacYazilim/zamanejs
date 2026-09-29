import { HashingAlgorithm, oidForHashingAlgorithms } from './hashingAlgoritms';
import * as asn1Ts from 'asn1-ts';
import { randomFillSync } from 'node:crypto';

// asn1-ts is CommonJS; native Node ESM exposes its exports on the default namespace.
const asn1 = (asn1Ts as typeof asn1Ts & { default?: typeof asn1Ts }).default ?? asn1Ts;
const { ASN1Construction, ASN1TagClass, ASN1UniversalType, DERElement, ObjectIdentifier } = asn1;

export class TimeStampRequest {
  protected nonce: Uint8Array;

  constructor(
    protected hashAlgorithm: HashingAlgorithm,
    protected hashValue: Uint8Array,
    nonce?: Uint8Array
  ) {
    if (nonce !== undefined && (!(nonce instanceof Uint8Array) || nonce.length < 8 || nonce.length > 32)) {
      throw new TypeError('Nonce must be a Uint8Array containing 8 to 32 bytes');
    }
    this.nonce = Uint8Array.from(nonce ?? this.generateNonce());
  }

  getNonce(): Uint8Array {
    return Uint8Array.from(this.nonce);
  }

  getRandomValues(abv: Uint8Array): Uint8Array {
    return randomFillSync(abv);
  }

  public getAsn1Payload(): Uint8Array {
    // Constructing the ASN.1 structure
    const requestPayload = new DERElement();
    requestPayload.tagClass = ASN1TagClass.universal;
    requestPayload.construction = ASN1Construction.constructed;
    requestPayload.tagNumber = ASN1UniversalType.sequence; // SEQUENCE

    // Version INTEGER
    const version = new DERElement();
    version.tagNumber = ASN1UniversalType.integer;
    version.integer = 1;

    // Hash Algorithm SEQUENCE
    const hashSequence = new DERElement();
    hashSequence.tagClass = ASN1TagClass.universal;
    hashSequence.construction = ASN1Construction.constructed;
    hashSequence.tagNumber = ASN1UniversalType.sequence;

    // Hash Algorithm SEQUENCE
    const hashAlgSequence = new DERElement();
    hashAlgSequence.tagClass = ASN1TagClass.universal;
    hashAlgSequence.construction = ASN1Construction.constructed;
    hashAlgSequence.tagNumber = ASN1UniversalType.sequence;

    const hashAlgorithmAid = oidForHashingAlgorithms[this.hashAlgorithm];

    const hashAlgOID = new DERElement();
    hashAlgOID.tagNumber = ASN1UniversalType.objectIdentifier;
    hashAlgOID.objectIdentifier = new ObjectIdentifier(hashAlgorithmAid.split('.').map((x) => parseInt(x, 10)));

    const nullElement = new DERElement();
    nullElement.tagNumber = ASN1UniversalType.nill;

    hashAlgSequence.sequence = [hashAlgOID, nullElement];

    // Hash Value OCTET STRING
    const hashValue = new DERElement();
    hashValue.tagNumber = ASN1UniversalType.octetString;
    hashValue.octetString = this.hashValue;

    hashSequence.sequence = [hashAlgSequence, hashValue];

    // Nonce INTEGER
    const nonce = new DERElement();
    nonce.tagNumber = ASN1UniversalType.integer;
    // RFC 3161 encodes the nonce as a positive INTEGER, not as an OCTET STRING.
    // Converting unsigned bytes to BigInt lets DER handle a leading zero sign byte
    // when the high bit is set and discard redundant leading zero bytes.
    nonce.integer = this.nonce.reduce((value, byte) => value * BigInt(256) + BigInt(byte), BigInt(0));

    // RequestedCertificate BOOLEAN
    const requestedCertificate = new DERElement();
    requestedCertificate.tagNumber = ASN1UniversalType.boolean;
    requestedCertificate.boolean = true;

    // Construct the full payload
    requestPayload.sequence = [version, hashSequence, nonce, requestedCertificate];

    // Convert to bytes
    return requestPayload.toBytes();
  }

  generateNonce(): Uint8Array {
    const randomBytes = new Uint8Array(8);
    this.getRandomValues(randomBytes);
    return randomBytes;
  }
}
