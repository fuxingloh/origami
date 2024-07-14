import { type Packed, unpack as unpackOJSON } from '@fuxingloh/origami-json';

import type { RpcService } from './services/RpcService';

export interface ClientConfig {
  endpoint?: string;
  token: string;
}

export type QueryOptions = Parameters<RpcService['streamQuery']>[0];
export type QueryResult = Awaited<ReturnType<RpcService['streamQuery']>>;

export type UnpackedData<Data> = Omit<QueryResult['data'][0], 'data'> & { data: Data };
export type UnpackedQueryResult<Data> = Omit<QueryResult, 'data'> & { data: UnpackedData<Data>[] };

/**
 * Simplified tree-shakable function to query for events from a stream without the whole OpenAPI client.
 * Recommended for edge and serverless environments.
 */
export async function query<Data>(config: ClientConfig, options?: QueryOptions): Promise<UnpackedQueryResult<Data>> {
  const endpoint = config.endpoint ?? 'https://origami.fuxing.dev/api/';
  const response = await fetch(`${endpoint}/queryStream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Authorization: `Bearer ${config.token}`,
    },
    body: JSON.stringify(options),
  });

  const object: any = await response.json();
  return unpack<Data>(object);
}

export function unpack<Data>(result: QueryResult): UnpackedQueryResult<Data> {
  return {
    data: result.data.map((item) => {
      return {
        data: unpackOJSON(item.data as Packed),
        sort: item.sort,
        hash: item.hash,
        n: item.n,
      };
    }),
    cursors: result.cursors,
  };
}
