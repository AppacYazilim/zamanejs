const possibleHashingAlgorithms = ['SHA-256', 'SHA-512'] as const;

export type HashingAlgorithm = (typeof possibleHashingAlgorithms)[number];

export const oidForHashingAlgorithms: Record<HashingAlgorithm, string> = {
  'SHA-256': '2.16.840.1.101.3.4.2.1',
  'SHA-512': '2.16.840.1.101.3.4.2.3'
};

export const hashByteLength: Record<HashingAlgorithm, number> = {
  'SHA-256': 32,
  'SHA-512': 64
};
