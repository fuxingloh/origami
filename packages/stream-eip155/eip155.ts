import type { EIP155BlockConfig, EIP155LogConfig, EIP155TxConfig } from '@fuxingloh/origami-program/stream/eip155';
import { FirstSignal, Stream, z } from '@imagiro/stream-core';
import { BlockNotFoundError, HttpTransport, PublicClient } from 'viem';
import { getBlock } from 'viem/actions';

export interface EIP155Header {
  hash: string;
  number: bigint;
}

type EIP155Config = EIP155BlockConfig | EIP155TxConfig | EIP155LogConfig;

export abstract class EIP155Stream<Data, Config extends EIP155Config> extends Stream<EIP155Header, Data, Config> {
  protected constructor(
    usi: string,
    protected readonly viem: PublicClient<HttpTransport>,
  ) {
    super(usi);
  }

  headerParser = z.object({
    hash: z.string(),
    number: z.bigint(),
  });

  public async getFirst(config: Config): Promise<FirstSignal<EIP155Header>> {
    if (config.from === 0) {
      return this.header({
        header: {
          hash: '0x0000000000000000000000000000000000000000000000000000000000000000',
          number: -1n,
        },
        sequence: -1n,
      });
    }

    const block = await this.getBlock(BigInt(config.from) - 1n);

    if (block === undefined) {
      return this.sleep();
    }

    return this.header({
      header: {
        hash: block.hash!,
        number: block.number!,
      },
      sequence: block.number!,
    });
  }

  protected async getBlock(
    blockNumber: bigint,
    includeTransactions = false,
  ): Promise<Awaited<ReturnType<typeof getBlock>> | undefined> {
    try {
      return await this.viem.getBlock({
        blockNumber: blockNumber,
        includeTransactions: includeTransactions,
      });
    } catch (e: any) {
      if (e instanceof BlockNotFoundError) {
        return undefined;
      }

      throw e;
    }
  }
}
