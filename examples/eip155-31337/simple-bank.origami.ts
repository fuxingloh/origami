import { EIP155Logs, Subscribe } from '@fuxingloh/origami/program';
import SimpleBank from '@workspace/solidity/contracts/SimpleBank.sol/SimpleBank.json';

export const subscribe: Subscribe = [
  {
    usi: 'eip155:31337/log',
    address: '0x7C93C37Ba28F7f2ED1B1b8aD9330E28733303826',
    abi: SimpleBank.abi,
  },
];

export function map(logs: EIP155Logs) {
  return logs
    .map((log) => {
      if (log.eventName !== 'Deposit' && log.eventName !== 'Withdraw') {
        return undefined;
      }

      return {
        $group: log.args.account,
        type: log.eventName === 'Deposit' ? 'deposit' : 'withdraw',
        amount: log.args.amount,
        block: {
          number: log.blockNumber,
        },
      };
    })
    .filter((log) => log !== undefined);
}
