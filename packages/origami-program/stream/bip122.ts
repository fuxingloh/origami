import { z } from 'zod';

export const BIP122BlockConfigSchema = z.object({
  usi: z.string().regex(/^bip122:[a-f0-9]{32}\/block$/),
  from: z.number().int().gte(0).default(0),
  to: z.number().int().gt(1).optional(),
});

export type BIP122BlockConfig = z.infer<typeof BIP122BlockConfigSchema>;

export interface BIP122Block {
  hash: string;
  height: number;
  version: number;
  versionHex: string;
  merkleroot: string;
  time: number;
  mediantime: number;
  nonce: number;
  bits: string;
  difficulty: number;
  chainwork: string;
  nTx: number;
  previousblockhash: string;
  strippedsize: number;
  size: number;
  weight: number;
  tx: string[];
}

export const BIP122TxConfigSchema = z.object({
  usi: z.string().regex(/^bip122:[a-f0-9]{32}\/tx$/),
  from: z.number().int().gte(0).default(0),
  to: z.number().int().gt(1).optional(),
});

export type BIP122TxConfig = z.infer<typeof BIP122TxConfigSchema>;

export type BIP122Txs = Array<BIP122Tx>;

interface BIP122Tx {
  txid: string;
  hash: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  locktime: number;
  vin: Array<BIP122Vin>;
  vout: Array<BIP122Vout>;
  hex: string;
}

type BIP122Vin =
  | {
      coinbase: string;
      sequence: number;
    }
  | {
      txid: string;
      vout: number;
      sequence: number;
    };

interface BIP122Vout {
  value: number;
  n: number;
  scriptPubKey: {
    hex: string;
    address?: string;
    type: string;
  };
}
