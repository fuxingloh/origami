import { Return, Subscribe } from '../types';

export const subscribe: Subscribe = [
  {
    usi: 'eip155:31337/log',
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    abi: 'erc20',
    from: 0,
    to: 100,
  },
  {
    usi: 'eip155:31337/log',
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    abi: 'erc20',
    from: 101,
  },
];

export function map(log: any): Return {
  return {
    hash: log.transactionHash,
    block: {
      hash: log.blockHash,
      number: log.blockNumber,
    },
    from: log.args.from,
    to: log.args.to,
    quantity: log.args.value,
  };
}
