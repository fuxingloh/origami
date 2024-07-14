import { StreamTester } from '@imagiro/stream-core/tester';
import { afterEach, beforeEach, expect, it } from '@jest/globals';
import { HardhatContainer, StartedHardhatContainer } from 'hardhat-testcontainers';

import { EIP155TxStream } from './tx';

let hardhat: StartedHardhatContainer;
let stream: EIP155TxStream;

beforeEach(async () => {
  hardhat = await new HardhatContainer().withMiningAuto(false).withMiningInterval(0).start();
  stream = new EIP155TxStream('eip155:0/tx', hardhat.client as any);
});

afterEach(async () => {
  await hardhat.stop();
});

it('should read [event,event,event,sleep]', async () => {
  const [address1, address2, address3] = await hardhat.client.getAddresses();
  await hardhat.client.sendTransaction({ to: address2, value: 100n, account: address1 });
  await hardhat.client.mine({ blocks: 1, interval: 1 });
  await hardhat.client.sendTransaction({ to: address3, value: 123456789n, account: address2 });
  await hardhat.client.sendTransaction({ to: address1, value: 100000000n, account: address2 });
  await hardhat.client.mine({ blocks: 1, interval: 2 });
  await hardhat.client.sendTransaction({ to: address2, value: 1234567890n, account: address2 });
  await hardhat.client.mine({ blocks: 1, interval: 3 });

  const tester = new StreamTester(stream, {
    usi: stream.usi,
    from: 1,
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
        from: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
        gas: expect.any(BigInt),
        gasPrice: expect.any(BigInt),
        hash: expect.any(String),
        input: '0x',
        nonce: 0,
        to: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
        transactionIndex: 0,
        value: 100n,
        v: 0n,
        r: '0xa86aa41ba07a62f55eb4552e2d2313080005ef7bbcd7510789db244ad4647e1c',
        s: '0x68a1f2f0d4f6a546bdb629dbdfdb5dcb566ee37691221227048c6aee128c6d9b',
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
        blockHash: expect.any(String),
        blockNumber: 2n,
        from: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
        gas: expect.any(BigInt),
        gasPrice: expect.any(BigInt),
        hash: expect.any(String),
        input: '0x',
        nonce: 0,
        to: '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
        transactionIndex: 0,
        value: 123456789n,
        v: 1n,
        r: '0x3f0c567f12a25bdaf31d1c5cde0adab7bc252d620680640c30c7ff45bf0efe6',
        s: '0x46d7bf7342870838d940f5699444c3605e44b9bb6274b72b147d9ea51b04805f',
      },
      {
        blockHash: expect.any(String),
        blockNumber: 2n,
        from: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
        gas: expect.any(BigInt),
        gasPrice: expect.any(BigInt),
        hash: expect.any(String),
        input: '0x',
        nonce: 1,
        to: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
        transactionIndex: 1,
        value: 100000000n,
        v: 0n,
        r: '0x5d5cf8682f65c4460a1d25ee2d3675633a722445b0f0a3c793556673bce83e39',
        s: '0x6d8df53c03fd5a0cd0efc5134831f5fbdcc6edc2e2bf2b98b6a2817fb8e110c7',
      },
    ],
  });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      number: 3n,
    },
    data: [
      {
        blockHash: expect.any(String),
        blockNumber: 3n,
        from: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
        gas: expect.any(BigInt),
        gasPrice: expect.any(BigInt),
        hash: expect.any(String),
        input: '0x',
        nonce: 2,
        to: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
        transactionIndex: 0,
        value: 1234567890n,
        v: 1n,
        r: '0xba1343842218f88b9801aae6718f1a7dba1d23ed77d45c115e8b39d0e7a2c49',
        s: '0x72d60bcf9e9ade07217f5bd39f3cdccccbd5297529e863169ce4c49204c60f4',
      },
    ],
  });

  expect(await tester.read()).toEqual({
    type: 'sleep',
  });
});
