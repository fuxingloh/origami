import type { BIP122Block, Subscribe } from '@fuxingloh/origami/program';

export const subscribe: Subscribe = [
  {
    usi: 'bip122:0f9188f13cb7b2c71f2a335e3a4fc328/block',
  },
];

export function map(block: BIP122Block) {
  return [
    {
      type: 'tx',
      height: BigInt(block.height),
      count: block.tx.length,
    },
    {
      type: 'block',
      height: BigInt(block.height),
    },
  ];
}
