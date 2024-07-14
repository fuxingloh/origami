import { Return, Subscribe } from '../types';

export const subscribe: Subscribe = [
  {
    usi: 'eip155:31337/block',
    from: 0.5,
  },
];

export function map(block: any): Return {
  return {
    hash: block.hash,
  };
}
