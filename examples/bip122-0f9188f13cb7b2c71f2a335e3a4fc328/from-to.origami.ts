import type { BIP122Block, Subscribe } from '@fuxingloh/origami/program';

export const subscribe: Subscribe = [
  {
    usi: 'bip122:0f9188f13cb7b2c71f2a335e3a4fc328/block',
    from: 1,
    to: 5,
  },
  {
    usi: 'bip122:0f9188f13cb7b2c71f2a335e3a4fc328/block',
    from: 10,
    to: 15,
  },
];

export function map(block: BIP122Block) {
  return [
    {
      height: BigInt(block.height),
    },
  ];
}
