import { HashingAlgorithm, oidForHashingAlgorithms } from './hashingAlgoritms';
import { ASN1Construction, ASN1TagClass, ASN1UniversalType, DERElement, ObjectIdentifier } from 'asn1-ts';
import { getRandomValues } from 'node:crypto';

export class TimeStampRequest {
  constructor(
    protected hashAlgorithm: HashingAlgorithm,
    protected hashValue: Uint8Array,
    protected nonce: Uint8Array | null = null
  ) {}

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
    // Assuming nonce is a large number, use BigInt and convert to bytes
    nonce.integer = BigInt('0x' + this.uint8tohex(this.nonce ?? this.generateNonce()));

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
    getRandomValues(randomBytes);
    return randomBytes;
  }

  uint8tohex(uint8: Uint8Array): string {
    return Array.prototype.map.call(uint8, (x) => ('00' + x.toString(16)).slice(-2)).join('');
  }
}
