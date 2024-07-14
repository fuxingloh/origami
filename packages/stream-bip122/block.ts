import type { BIP122Block, BIP122BlockConfig } from '@fuxingloh/origami-program/types';
import { NextSignal, z } from '@imagiro/stream-core';

import { BIP122ClientOptions, BIP122Header, BIP122Stream } from './bip122';

export class BIP122BlockStream extends BIP122Stream<BIP122Block, BIP122BlockConfig> {
  public constructor(usi: string, options: BIP122ClientOptions) {
    super(usi, options);
  }

  dataParser = z
    .object({
      hash: z.string(),
      height: z.number(),
      version: z.number(),
      versionHex: z.string(),
      merkleroot: z.string(),
      time: z.number(),
      mediantime: z.number(),
      nonce: z.number(),
      bits: z.string(),
      difficulty: z.number(),
      chainwork: z.string(),
      nTx: z.number(),
      previousblockhash: z
        .string()
        .optional()
        .default('0000000000000000000000000000000000000000000000000000000000000000'),
      strippedsize: z.number(),
      size: z.number(),
      weight: z.number(),
      tx: z.array(z.string()),
    })
    .refine((block) => {
      if (
        block.height === 0 &&
        block.previousblockhash === '0000000000000000000000000000000000000000000000000000000000000000'
      ) {
        return true;
      }
      return (
        block.height > 0 &&
        block.previousblockhash !== '0000000000000000000000000000000000000000000000000000000000000000'
      );
    });

  public async getNext(config: BIP122BlockConfig, prev: BIP122Header): Promise<NextSignal<BIP122Header, BIP122Block>> {
    const block = await this.getBlock(prev.height + 1, 1);
    if (block === undefined) {
      return this.sleep();
    }

    if (block.previousblockhash !== prev.hash && block.height !== 0) {
      return this.fork({ header: prev });
    }

    if (config.to !== undefined && block.height > config.to) {
      return this.completed();
    }

    return this.event({
      header: {
        hash: block.hash,
        height: block.height,
      },
      data: block,
      sequence: BigInt(block.height),
      timestamp: block.mediantime,
    });
  }
}
