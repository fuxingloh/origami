import { BIP122Block, EIP155Block, Event, Subscribe } from '../types';

export const subscribe: Subscribe = [
  { usi: 'eip155:31337/block' },
  { usi: 'bip122:0f9188f13cb7b2c71f2a335e3a4fc328/block' },
];

interface BlocksReturn {
  type: 'ethereum' | 'bitcoin';
  hash: string;
  number: bigint;
}

export function map(block: EIP155Block | BIP122Block, event: Event): BlocksReturn | undefined {
  if (event.usi === 'eip155:31337/block') {
    const hardhat = block as EIP155Block;
    return {
      type: 'ethereum',
      hash: hardhat.hash,
      number: hardhat.number,
    };
  }

  if (event.usi === 'bip122:0f9188f13cb7b2c71f2a335e3a4fc328/block') {
    const bitcoin = block as BIP122Block;
    return {
      type: 'bitcoin',
      hash: bitcoin.hash,
      number: BigInt(bitcoin.height),
    };
  }

  return undefined;
}
