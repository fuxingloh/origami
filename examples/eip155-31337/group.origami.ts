import { EIP155Block, Return, Subscribe } from '@fuxingloh/origami/program';

export const subscribe: Subscribe = [
  {
    usi: 'eip155:31337/block',
  },
];

export function map(block: EIP155Block): Return {
  return {
    $group: block.miner,
    miner: block.miner,
    number: block.number,
    hash: block.hash,
    difficulty: block.difficulty,
    timestamp: block.timestamp,
  };
}
