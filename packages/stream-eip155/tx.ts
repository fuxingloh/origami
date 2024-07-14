import type { EIP155TxConfig } from '@fuxingloh/origami-program/types';
import { NextSignal, z } from '@imagiro/stream-core';
import type { HttpTransport, PublicClient } from 'viem';

import { EIP155Header, EIP155Stream } from './eip155';

export class EIP155TxStream extends EIP155Stream<any, EIP155TxConfig> {
  constructor(usi: string, viem: PublicClient<HttpTransport>) {
    super(usi, viem);
  }

  dataParser = z.array(
    z.object({
      blockHash: z.string(),
      blockNumber: z.bigint(),
      from: z.string(),
      gas: z.bigint(),
      gasPrice: z.bigint(),
      hash: z.string(),
      input: z.string(),
      nonce: z.number(),
      to: z.string(),
      transactionIndex: z.number(),
      value: z.bigint(),
      v: z.bigint(),
      r: z.string(),
      s: z.string(),
    }),
  );

  public async getNext(config: EIP155TxConfig, prev: EIP155Header): Promise<NextSignal<EIP155Header, any>> {
    const block = await this.getBlock(prev.number + 1n, true);
    if (block === undefined) {
      return this.sleep();
    }

    if (block.parentHash !== prev.hash) {
      return this.fork({ header: prev });
    }

    if (config.to !== undefined && prev.number >= BigInt(config.to)) {
      return this.completed();
    }

    return this.event({
      header: {
        hash: block.hash!,
        number: block.number!,
      },
      data: block.transactions,
      sequence: block.number!,
      timestamp: Number(block.timestamp!),
    });
  }
}
