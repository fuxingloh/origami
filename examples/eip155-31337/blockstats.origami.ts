import { EIP155Block, Return, Subscribe } from '@fuxingloh/origami/program';

export const subscribe: Subscribe = [
  {
    usi: 'eip155:31337/block',
  },
];

export function map(block: EIP155Block): Return {
  if (block.number === 1n) {
    return undefined;
  }

  if (block.number === 2n) {
    return {
      number: block.number,
      custom: block.hash,
    };
  }

  return {
    number: block.number,
    hash: block.hash,
    difficulty: block.difficulty,
  };
}
