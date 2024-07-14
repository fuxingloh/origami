import { Return, Subscribe } from '../types';

export const subscribe: Subscribe = [
  {
    usi: '31337/block',
  },
];

export function map(block: any): Return {
  return {
    hash: block.hash,
  };
}
