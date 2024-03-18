import { ASN1Element, ASN1TagClass, ASN1UniversalType, DERElement } from 'asn1-ts';

export function zamaneZdFix(inputData: Buffer) {
  const asn1 = new DERElement();
  asn1.fromBytes(inputData);

  // Function to recursively search for pkcs7-signedData
  function findPkcs7SignedData(element: ASN1Element) {
    // Check if the element is a sequence
    if (element.tagClass === ASN1TagClass.universal && element.tagNumber === ASN1UniversalType.sequence) {
      const sequence = element.sequence;
      for (const subElement of sequence) {
        // Check if this is an OID
        if (
          subElement.tagClass === ASN1TagClass.universal &&
          subElement.tagNumber === ASN1UniversalType.objectIdentifier
        ) {
          const oid = subElement.objectIdentifier;
          // Check if the OID is for pkcs7-signedData
          if (oid.toString() === '1.2.840.113549.1.7.2') {
            console.log('Found pkcs7-signedData OID');
            // Do something with subElement or its parent sequence
            // Depending on your requirements, you might want to extract this sequence, modify it, etc.

            const pkcs7Sequence = element;
            const writer = new DERElement();
            writer.tagClass = pkcs7Sequence.tagClass;
            writer.tagNumber = pkcs7Sequence.tagNumber;
            writer.construction = pkcs7Sequence.construction;
            writer.sequence = pkcs7Sequence.sequence;
            return writer.toBytes();
          }
        } else if (
          subElement.tagClass === ASN1TagClass.universal &&
          subElement.tagNumber === ASN1UniversalType.sequence
        ) {
          return findPkcs7SignedData(subElement); // Recursively search in sub-sequences
        }
      }
    }
  }

  return findPkcs7SignedData(asn1);
}
