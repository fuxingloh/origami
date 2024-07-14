import { EIP155Logs, Return, Subscribe } from '@fuxingloh/origami/program';
import Token from '@workspace/solidity/contracts/Token.sol/Token.json';

export const subscribe: Subscribe = [
  {
    usi: 'eip155:31337/log',
    address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    abi: Token.abi,
    event: 'Mint',
  },
  {
    usi: 'eip155:1337/log',
    address: '0x8464135c8F25Da09e49BC8782676a84730C318bC',
    abi: Token.abi,
    event: 'Mint',
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
      to: log.args.to as string,
      amount: log.args.amount as bigint,
    };
  });
}
