import type { EIP155Block, EIP155BlockConfig } from '@fuxingloh/origami-program/types';
import { NextSignal, z } from '@imagiro/stream-core';
import { type HttpTransport, type PublicClient } from 'viem';

import { EIP155Header, EIP155Stream } from './eip155';

export class EIP155BlockStream extends EIP155Stream<EIP155Block, EIP155BlockConfig> {
  constructor(usi: string, viem: PublicClient<HttpTransport>) {
    super(usi, viem);
  }

  dataParser = z.object({
    hash: z.string(),
    number: z.bigint(),
    parentHash: z.string(),
    nonce: z.string(),
    difficulty: z.bigint(),
    totalDifficulty: z.bigint(),
    extraData: z.string(),
    miner: z.string(),
    size: z.bigint(),
    timestamp: z.bigint(),
    baseFeePerGas: z.bigint(),
    gasLimit: z.bigint(),
    gasUsed: z.bigint(),
    blobGasUsed: z.bigint(),
    excessBlobGas: z.bigint(),
    logsBloom: z.string(),
    mixHash: z.string(),
  });

  public async getNext(config: EIP155BlockConfig, prev: EIP155Header): Promise<NextSignal<EIP155Header, EIP155Block>> {
    const block = await this.getBlock(prev.number + 1n);
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
      data: block,
      sequence: block.number!,
      timestamp: Number(block.timestamp!),
    });
  }
}
