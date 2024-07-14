import { Return, Subscribe } from '../types';
import Contract from './import-abi.json';

export const subscribe: Subscribe = [
  {
    usi: 'eip155:31337/log',
    abi: Contract.abi,
  },
];

export function map(log: any): Return {
  return {
    hash: log.transactionHash,
    block: {
      hash: log.blockHash,
      number: log.blockNumber,
    },
  };
}
