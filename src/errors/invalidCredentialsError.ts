export class TssAdressNotHttpOrHttpsError extends Error {
  constructor() {
    super('The TSS address must be a valid http or https address');
  }
}

export class TssAdressNotParsableError extends Error {
  constructor() {
    super('The TSS address is not parsable. Please make sure it is a valid URL');
  }
}

export class InvalidHexError extends Error {
  constructor() {
    super('Invalid hex string');
  }
}

export class FileNotReadableError extends Error {
  constructor() {
    super('The file is not readable');
  }
}
