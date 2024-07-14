import { createPublicClient, http } from 'viem';
import { hardhat } from 'viem/chains';

import { EIP155BlockStream } from './block';
import { EIP155LogStream } from './log';
import { EIP155TxStream } from './tx';

export class HardhatBlockStream extends EIP155BlockStream {
  public constructor(usi: string, options: { endpoint: string }) {
    super(
      usi,
      createPublicClient({
        chain: hardhat,
        transport: http(options.endpoint),
      }),
    );
  }
}

export class HardhatLogStream extends EIP155LogStream {
  public constructor(usi: string, options: { endpoint: string }) {
    super(
      usi,
      createPublicClient({
        chain: hardhat,
        transport: http(options.endpoint),
      }),
    );
  }
}

export class HardhatTxStream extends EIP155TxStream {
  public constructor(usi: string, options: { endpoint: string }) {
    super(
      usi,
      createPublicClient({
        chain: hardhat,
        transport: http(options.endpoint),
      }),
    );
  }
}
