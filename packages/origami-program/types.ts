import { z } from 'zod';

import { BIP122BlockConfigSchema, BIP122TxConfigSchema } from './stream/bip122';
import { EIP155BlockConfigSchema, EIP155LogConfigSchema, EIP155TxConfigSchema } from './stream/eip155';

export type * from './stream/bip122';
export type * from './stream/eip155';

/**
 * - string
 * - number
 * - boolean
 * - array
 * - object
 * - null
 * - bigint (not supported in JSON)
 */
export type Data = string | number | boolean | bigint | Array<Data> | { [key: string]: Data } | null;

const dataSchema: z.ZodType<Data> = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.bigint(),
  z.array(z.lazy(() => dataSchema)),
  z.record(
    z.string(),
    z.lazy(() => dataSchema),
  ),
  z.null(),
]);

export const streamSchema = z
  .object({
    /**
     * Custom sort key.
     * Max-length: 256 characters.
     * Defaults to the natural order of the data.
     */
    $sort: z.string().min(1).max(256).optional(),
    /**
     * Custom group key to query data by "group", e.g. by "user".
     * Max-length: 256 characters.
     */
    $group: z.string().min(1).max(256).optional(),
  })
  .and(z.record(z.string(), dataSchema));

export type Stream = z.infer<typeof streamSchema>;

/**
 * The data returned by the map function.
 * It can be undefined if the program does not want to emit any data.
 *
 * @example
 * ```ts
 * export function map(data: any, event: Event): Return {
 *  if (condition) {
 *    // No data will be emitted.
 *    return undefined;
 *  }
 *
 *  if (condition) {
 *    // Emit a single object.
 *    return {
 *      $sort: 'custom-sort-key',
 *      $group: 'custom-group-key',
 *      'key': 'value',
 *    }
 *  }
 *
 *  // Emit an array of object.
 *  return [
 *    {
 *      'type': 'a',
 *    },
 *    {
 *      'type': 'b',
 *    },
 *  ]
 * }
 * ```
 */
export type Return = Stream | Stream[] | undefined;

/**
 * Event is the parameter all programs receive as the second parameter.
 * @example
 * ```ts
 * export function map(data: any, event: Event) {}
 * ```
 */
export interface Event {
  /**
   * Unique Stream Identifier, the source of this event.
   */
  usi: string;
  /**
   * Event-hash that is unique within across all streams.
   */
  hash: string;
  /**
   * Event-sequence
   */
  sequence: bigint;
  /**
   * Event-timestamp in unix epoch seconds.
   */
  timestamp: number;
}

export const subscriptionConfigSchema = z.union([
  BIP122BlockConfigSchema,
  BIP122TxConfigSchema,
  EIP155BlockConfigSchema,
  EIP155TxConfigSchema,
  EIP155LogConfigSchema,
]);
export type SubscriptionConfig = z.infer<typeof subscriptionConfigSchema>;

export const subscribeSchema = z
  .array(subscriptionConfigSchema)
  .min(1, 'You must subscribe to at least one event.')
  .max(100, 'You can subscribe to at most 100 events.');

export type Subscribe = z.input<typeof subscribeSchema>;
