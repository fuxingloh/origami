import { getAddress, getContractAddress } from 'viem';

import { Return, Subscribe } from '../types';

export const subscribe: Subscribe = [
  {
    usi: 'eip155:31337/log',
    abi: 'erc20',
  },
];

export function map(log: any): Return {
  return {
    hash: log.transactionHash,
    block: {
      hash: log.blockHash,
      number: log.blockNumber,
    },
    // Checksum from/to addresses
    from: getAddress(log.args.from),
    to: getAddress(log.args.to),
    quantity: log.args.value,
    create2: getContractAddress({
      from: '0x1234567890123456789012345678901234567890',
      salt: '0x13',
      opcode: 'CREATE2',
      bytecode: '0x1234567890123456789012345678901234567890',
    }),
  };
}
