import { EIP155Logs, Return, Subscribe } from '@fuxingloh/origami/program';

export const subscribe: Subscribe = [
  {
    usi: 'eip155:31337/log',
    address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    abi: 'erc20',
    event: 'Transfer',
  },
];

export function map(logs: EIP155Logs): Return {
  return logs.map((log) => {
    return {
      block: {
        hash: log.blockHash,
        number: log.blockNumber,
      },
      transaction: {
        hash: log.transactionHash,
      },
      from: log.args.from as string,
      to: log.args.to as string,
      quantity: log.args.value as bigint,
    };
  });
}
