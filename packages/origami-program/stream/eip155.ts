import { z } from 'zod';

export const EIP155BlockConfigSchema = z.object({
  usi: z.string().regex(/^eip155:[0-9]{1,32}\/block$/),
  from: z.number().int().gte(0).default(0),
  to: z.number().int().gt(1).optional(),
});

export type EIP155BlockConfig = z.infer<typeof EIP155BlockConfigSchema>;

export interface EIP155Block {
  hash: string;
  number: bigint;
  parentHash: string;
  nonce: string;
  difficulty: bigint;
  totalDifficulty: bigint;
  extraData: string;
  miner: string;
  size: bigint;
  timestamp: bigint;
  baseFeePerGas: bigint;
  gasLimit: bigint;
  gasUsed: bigint;
  blobGasUsed: bigint;
  excessBlobGas: bigint;
  logsBloom: string;
  mixHash: string;
}

export const EIP155TxConfigSchema = z.object({
  usi: z.string().regex(/^eip155:[0-9]{1,32}\/tx$/),
  from: z.number().int().gte(0).default(0),
  to: z.number().int().gt(1).optional(),
});

export type EIP155TxConfig = z.infer<typeof EIP155TxConfigSchema>;

export const EIP155LogConfigSchema = z.object({
  usi: z.string().regex(/^eip155:[0-9]{1,32}\/log$/),
  from: z.number().int().gte(0).default(0),
  to: z.number().int().gt(1).optional(),
  // TODO(?): support more built-in abi types. Also we should select ABIs that covers more events.
  abi: z.union([z.literal('erc20'), z.array(z.unknown())]),
  // TODO(?): refine event to validate against what is available in the abi that is provided.
  event: z.string().optional(),
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
  args: z.record(z.string(), z.unknown()).optional(),
});

export type EIP155LogConfig = z.infer<typeof EIP155LogConfigSchema>;

/**
 * Multiple logs are returned per map function call.
 * Logs can come form multiple contracts, events or blocks.
 */
export type EIP155Logs = Array<EIP155Log>;

/**
 * Not exported to prevent direct usage.
 * Separately defined for improved typescript performance.
 */
interface EIP155Log {
  eventName: string;
  args: Record<string, unknown>;
  logIndex: number;
  transactionIndex: number;
  transactionHash: string;
  blockHash: string;
  blockNumber: bigint;
  address: string;
  data: string;
  topics: string[];
}
