import { createPublicClient, getAddress, getContractAddress, http } from 'viem';
import { hardhat } from 'viem/chains';

export const subscribe = [
  {
    usi: 'eip155:31337/block',
  },
];

export async function map(block: any) {
  const client = createPublicClient({
    chain: hardhat,
    transport: http('http://localhost:8545'),
  });

  const number = await client.getBlockNumber();

  return {
    number: block.number,
    height: number,
    address: getAddress('0x1234567890123456789012345678901234567890'),
    CREATE: getContractAddress({
      from: '0x1234567890123456789012345678901234567890',
      nonce: 0n,
      opcode: 'CREATE',
    }),
    CREATE2: getContractAddress({
      from: '0x1234567890123456789012345678901234567890',
      salt: '0x13',
      opcode: 'CREATE2',
      bytecode: '0x1234567890123456789012345678901234567890',
    }),
  };
}
