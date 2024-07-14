import { Return, Subscribe } from '../types';

export const subscribe: Subscribe = [
  {
    usi: 'eip155:1/block',
  },
];

export async function map(log: any): Promise<Return> {
  return {
    hash: log.hash,
  };
}
