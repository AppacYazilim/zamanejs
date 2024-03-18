import { Zamane } from './zamane';
import { file } from 'tmp-promise';
import * as fs from 'fs';
import { FileNotReadableError, InvalidHexError } from './errors/invalidCredentialsError';

describe('Hashing Tests', () => {
  const zamane = new Zamane({ tssAddress: 'http://localhost:8080', hashAlgorithm: 'SHA-256' });

  it('should hash contents', async () => {
    // Arrange
    const content = 'Hello, World!';

    // Act
    const hash = await zamane.hashFromString(content);

    // Assert
    expect(hash.toString('hex')).toBe('dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f');
  });

  it('should hash contents 2', async () => {
    // Arrange
    const content = 'Hello, World';

    // Act
    const hash = await zamane.hashFromString(content);

    // Assert
    expect(hash.toString('hex')).toBe('03675ac53ff9cd1535ccc7dfcdfa2c458c5218371f418dc136f2d19ac1fbe8a5');
  });

  it('should hash buffer', async () => {
    // Arrange
    const content = Buffer.from('Hello, World!');

    // Act
    const hash = await zamane.hashFromContent(content);

    // Assert
    expect(hash.toString('hex')).toBe('dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f');
  });

  it('should hash buffer 2', async () => {
    // Arrange
    const content = Buffer.from('Hello, World');

    // Act
    const hash = await zamane.hashFromContent(content);

    // Assert
    expect(hash.toString('hex')).toBe('03675ac53ff9cd1535ccc7dfcdfa2c458c5218371f418dc136f2d19ac1fbe8a5');
  });

  it('should hash file', async () => {
    const { path } = await file();

    // Arrange
    const content = 'Hello, World!';
    fs.writeFileSync(path, content);

    // Act
    const hash = await zamane.hashFromPath(path);

    // Assert
    expect(hash.toString('hex')).toBe('dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f');
  });

  it('should throw on invalid file', async () => {
    // Arrange
    const path = 'invalid';

    // Act
    const act = () => {
      return zamane.hashFromPath(path);
    };

    // Assert
    await expect(act).rejects.toThrow(FileNotReadableError);
  });

  it('shold convert hex to array buffer', async () => {
    // Arrange
    const hash = 'dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f';

    // Act
    const arrayBuffer = Zamane.hexToArrayBuffer(hash);

    // Assert
    expect(arrayBuffer).toBeInstanceOf(Uint8Array);

    // Assert
    expect(arrayBuffer).toEqual(
      Uint8Array.from([
        223, 253, 96, 33, 187, 43, 213, 176, 175, 103, 98, 144, 128, 158, 195, 165, 49, 145, 221, 129, 199, 247,
        10, 75, 40, 104, 138, 54, 33, 130, 152, 111
      ])
    );
  });

  it('should throw InvalidHexError', async () => {
    // Arrange
    const hash = 'invalid';

    // Act
    const act = async () => {
      return Zamane.hexToArrayBuffer(hash);
    };
    // Assert
    await expect(act).rejects.toThrow(InvalidHexError);
  });
});
