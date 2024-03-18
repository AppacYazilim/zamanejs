import { HashingAlgorithm } from './hashingAlgoritms';

type ZamaneServerCredentials = {
  /**
   * The address of the TSS server
   * If the port is different from the default, it should be included in the address
   * Example: 'http://tss.server.com:8080'
   *
   * It must be a valid http or https address
   */
  tssAddress: string;
  hashAlgorithm: HashingAlgorithm;
};

export type ZamaneCredentials =
  | ({
      customerNo: string;
      customerPassword: string;
    } & ZamaneServerCredentials)
  | ZamaneServerCredentials;
