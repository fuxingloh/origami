import type { BIP122TxConfig, BIP122Txs } from '@fuxingloh/origami-program/types';
import { NextSignal, z } from '@imagiro/stream-core';

import { BIP122ClientOptions, BIP122Header, BIP122Stream } from './bip122';

export class BIP122TxStream extends BIP122Stream<BIP122Txs, BIP122TxConfig> {
  public constructor(usi: string, options: BIP122ClientOptions) {
    super(usi, options);
  }

  dataParser = z.array(
    z.object({
      txid: z.string(),
      hash: z.string(),
      version: z.number(),
      size: z.number(),
      vsize: z.number(),
      weight: z.number(),
      locktime: z.number(),
      vin: z.array(
        z
          .object({
            coinbase: z.string(),
            sequence: z.number(),
          })
          .or(
            z.object({
              txid: z.string(),
              vout: z.number(),
              sequence: z.number(),
            }),
          ),
      ),
      vout: z.array(
        z.object({
          value: z.number(),
          n: z.number(),
          scriptPubKey: z.object({
            hex: z.string(),
            address: z.string().optional(),
            type: z.string(),
          }),
        }),
      ),
      hex: z.string(),
    }),
  );

  public async getNext(config: BIP122TxConfig, prev: BIP122Header): Promise<NextSignal<BIP122Header, any>> {
    const block = await this.getBlock(prev.height + 1, 2);
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
      data: block.tx,
      sequence: BigInt(block.height),
      timestamp: block.mediantime,
    });
  }
}
