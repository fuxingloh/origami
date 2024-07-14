import { join } from 'node:path';

import type { Return, Subscribe } from '../types';

export const subscribe: Subscribe = [
  {
    usi: 'eip155:1337/block',
  },
];

export function map(data: any): Return {
  return {
    hash: data.transactionHash,
    path: join('path', 'to', 'file'),
  };
}
