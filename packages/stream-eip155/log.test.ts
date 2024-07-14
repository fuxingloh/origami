import { StreamTester } from '@imagiro/stream-core/tester';
import { afterEach, beforeEach, expect, it } from '@jest/globals';
import Token from '@workspace/solidity/contracts/Token.sol/Token.json';
import { HardhatContainer, StartedHardhatContainer } from 'hardhat-testcontainers';
import { getContract, getContractAddress } from 'viem';

import { EIP155LogStream } from './log';

let hardhat: StartedHardhatContainer;
let stream: EIP155LogStream;

beforeEach(async () => {
  hardhat = await new HardhatContainer().withMiningAuto(false).withMiningInterval(0).start();
  stream = new EIP155LogStream('eip155:0/log', hardhat.client as any);
});

afterEach(async () => {
  await hardhat.stop();
});

it('should read [header,event,sleep]', async () => {
  const tester = new StreamTester(stream, {
    usi: stream.usi,
    from: 0,
    abi: 'erc20',
  });

  const [address1] = await hardhat.client.getAddresses();
  const hash = await hardhat.client.deployContract({
    abi: Token.abi,
    bytecode: Token.bytecode as `0x${string}`,
    args: ['NAME', 'TOK', 1000000000n],
    account: address1,
  });
  const transaction = await hardhat.client.getTransaction({ hash: hash });
  const contract = getContract({
    address: getContractAddress({ from: transaction.from, nonce: BigInt(transaction.nonce) }),
    abi: Token.abi,
    client: {
      public: hardhat.client,
      wallet: hardhat.client,
    },
  });
  await hardhat.client.mine({ blocks: 1 });

  expect(await tester.read()).toMatchObject({
    type: 'header',
    header: {
      hash: expect.any(String),
      number: 0n,
    },
  });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      number: 1n,
    },
    data: [
      {
        address: contract.address.toLowerCase(),
        args: {
          from: '0x0000000000000000000000000000000000000000',
          to: expect.any(String),
          value: 1000000000n,
        },
        blockHash: expect.any(String),
        blockNumber: 1n,
        eventName: 'Transfer',
        logIndex: 0,
        topics: expect.any(Array),
        transactionHash: expect.any(String),
        transactionIndex: 0,
      },
    ],
  });

  expect(await tester.read()).toEqual({
    type: 'sleep',
  });
});

it('should read [header,event,event,fork,event,header,sleep]', async () => {
  const [address1, address2, address3] = await hardhat.client.getAddresses();
  const hash = await hardhat.client.deployContract({
    abi: Token.abi,
    bytecode: Token.bytecode as `0x${string}`,
    args: ['NAME', 'TOK', 1000000000n],
    account: address1,
  });
  const transaction = await hardhat.client.getTransaction({ hash: hash });
  const contract = getContract({
    address: getContractAddress({ from: transaction.from, nonce: BigInt(transaction.nonce) }),
    abi: Token.abi,
    client: {
      public: hardhat.client,
      wallet: hardhat.client,
    },
  });
  await hardhat.client.mine({ blocks: 1 });
  const snapshotId = await hardhat.client.snapshot();
  await contract.write.transfer([address2, 50n], { account: address1 });
  await hardhat.client.mine({ blocks: 1 });

  const tester = new StreamTester(stream, {
    usi: stream.usi,
    from: 0,
    abi: 'erc20',
  });

  expect(await tester.read()).toMatchObject({
    type: 'header',
    header: {
      hash: expect.any(String),
      number: 0n,
    },
  });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      number: 1n,
    },
    data: [
      {
        blockHash: expect.any(String),
        blockNumber: 1n,
      },
    ],
  });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      number: 2n,
    },
    data: [
      {
        address: contract.address.toLowerCase(),
        args: {
          from: address1,
          to: expect.any(String),
          value: 50n,
        },
        blockHash: expect.any(String),
        blockNumber: 2n,
        eventName: 'Transfer',
        logIndex: 0,
        topics: expect.any(Array),
        transactionHash: expect.any(String),
        transactionIndex: 0,
      },
    ],
  });

  await hardhat.client.revert({ id: snapshotId });
  await contract.write.transfer([address3, 500n], { account: address1 });
  await contract.write.transfer([address2, 100n], { account: address1 });
  await hardhat.client.mine({ blocks: 2 });

  expect(await tester.read()).toMatchObject({
    type: 'fork',
    header: {
      hash: expect.any(String),
      number: 2n,
    },
  });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      number: 2n,
    },
    data: [
      {
        args: {
          from: address1,
          to: address3,
          value: 500n,
        },
        logIndex: 0,
        transactionIndex: 0,
      },
      {
        args: {
          from: address1,
          to: address2,
          value: 100n,
        },
        logIndex: 1,
        transactionIndex: 1,
      },
    ],
  });

  expect(await tester.read()).toMatchObject({
    type: 'header',
    header: {
      hash: expect.any(String),
      number: 3n,
    },
  });

  expect(await tester.read()).toEqual({
    type: 'sleep',
  });
});
