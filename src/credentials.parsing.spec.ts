import { ZamaneCredentials } from './credentials';
import { TssAdressNotParsableError } from './errors/invalidCredentialsError';
import { Zamane } from './zamane';

describe('Zamane Tests', () => {
  it('should throw TssAdressNotParsableError', () => {
    // Arrange
    const credentials = {
      tssAddress: 'invalid',
      hashAlgorithm: 'SHA-256'
    } satisfies ZamaneCredentials;

    // Act
    const act = () => {
      new Zamane(credentials);
    };

    // Assert
    expect(act).toThrow(TssAdressNotParsableError);
  });

  it('should not throw TssAdressNotParsableError', () => {
    // Arrange
    const credentials = {
      tssAddress: 'http://localhost:8080',
      hashAlgorithm: 'SHA-256'
    } satisfies ZamaneCredentials;

    // Act
    const act = () => {
      new Zamane(credentials);
    };

    // Assert
    expect(act).not.toThrow(TssAdressNotParsableError);
  });

  it('should throw TssAdressNotHttpOrHttpsError', () => {
    // Arrange
    const credentials = {
      tssAddress: 'ftp://localhost:8080',
      hashAlgorithm: 'SHA-256'
    } satisfies ZamaneCredentials;

    // Act
    const act = () => {
      new Zamane(credentials);
    };

    // Assert
    expect(act).toThrow(TssAdressNotParsableError);
  });
});
