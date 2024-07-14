import { randomInt } from 'node:crypto';

import type { BIP122BlockConfig, BIP122TxConfig } from '@fuxingloh/origami-program/stream/bip122';
import { FirstSignal, Stream, z } from '@imagiro/stream-core';

export interface BIP122Header {
  hash: string;
  height: number;
}

export interface BIP122ClientOptions {
  endpoint: string;
  headers?: Record<string, string>;
}

type BIP122Config = BIP122BlockConfig | BIP122TxConfig;

export abstract class BIP122Stream<Data, Config extends BIP122Config> extends Stream<BIP122Header, Data, Config> {
  protected constructor(
    usi: string,
    protected readonly options: BIP122ClientOptions,
  ) {
    super(usi);
  }

  headerParser = z.object({
    hash: z.string(),
    height: z.number(),
  });

  async getFirst(config: Config): Promise<FirstSignal<BIP122Header>> {
    if (config.from === 0) {
      // From the genesis block, there is no previous header.
      return this.header({
        header: {
          hash: '0000000000000000000000000000000000000000000000000000000000000000',
          height: -1,
        },
        sequence: -1n,
      });
    }

    const block = await this.getBlock(config.from - 1, 1);
    if (block === undefined) {
      return this.sleep();
    }

    return this.header({
      header: {
        hash: block.hash,
        height: block.height,
      },
      sequence: BigInt(block.height),
    });
  }

  /**
   * See https://developer.bitcoin.org/reference/rpc/getblock.html
   * for more information about the verbosity parameter and the return value.
   */
  protected async getBlock(height: number, verbosity: 0 | 1 | 2): Promise<any | undefined> {
    const getBlockhashResponse = await this.rpc('getblockhash', [height]);
    if (getBlockhashResponse.error !== null) {
      if (
        getBlockhashResponse.error.code === -8 &&
        getBlockhashResponse.error.message === 'Block height out of range'
      ) {
        return undefined;
      }
      throw getBlockhashResponse.error;
    }

    const getBlockResponse = await this.rpc('getblock', [getBlockhashResponse.result, verbosity]);
    if (getBlockResponse.error !== null) {
      throw getBlockResponse.error;
    }

    return getBlockResponse.result;
  }

  protected async rpc(
    method: string,
    params: any,
  ): Promise<{
    error: any;
    id: number;
    result: any;
  }> {
    try {
      const response = await fetch(this.options.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.options.headers,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: randomInt(0, 999999999999),
          method: method,
          params: params,
        }),
      });

      return (await response.json()) as any;
    } catch (e) {
      return {
        error: e,
        id: -1,
        result: null,
      };
    }
  }
}
