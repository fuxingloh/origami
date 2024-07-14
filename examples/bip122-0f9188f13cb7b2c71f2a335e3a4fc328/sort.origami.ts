import type { BIP122Block, Return, Subscribe } from '@fuxingloh/origami/program';

export const subscribe: Subscribe = [
  {
    usi: 'bip122:0f9188f13cb7b2c71f2a335e3a4fc328/block',
  },
];

export function map(block: BIP122Block): Return {
  return [
    {
      $sort: block.height.toString(10),
      type: 'top',
      height: BigInt(block.height),
    },
    {
      $sort: block.height.toString(10),
      type: 'bottom',
      height: BigInt(block.height),
    },
  ];
}
