import { EIP155Block, Subscribe } from '../types';

export const subscribe: Subscribe = [
  {
    usi: 'eip155:31337/block',
  },
];

export function map(block: EIP155Block): any {
  if (block.number === 100n) {
    return undefined;
  }

  if (block.number === 200n) {
    return {
      number: 200n,
    };
  }

  return {
    number: block.number,
  };
}
