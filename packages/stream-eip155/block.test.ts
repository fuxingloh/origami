import { StreamTester } from '@imagiro/stream-core/tester';
import { afterEach, beforeEach, expect, it } from '@jest/globals';
import { HardhatContainer, StartedHardhatContainer } from 'hardhat-testcontainers';

import { EIP155BlockStream } from './block';

let hardhat: StartedHardhatContainer;
let stream: EIP155BlockStream;

beforeEach(async () => {
  hardhat = await new HardhatContainer().withMiningAuto(false).withMiningInterval(0).start();
  stream = new EIP155BlockStream('eip155:0/block', hardhat.client as any);
});

afterEach(async () => {
  await hardhat.stop();
});

it('should read [event,event,event,sleep]', async () => {
  await hardhat.client.mine({ blocks: 2 });

  const tester = new StreamTester(stream, {
    usi: stream.usi,
    from: 0,
  });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      number: 0n,
    },
    data: {
      number: 0n,
    },
  });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      number: 1n,
    },
    data: {
      number: 1n,
    },
  });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      number: 2n,
    },
    data: {
      number: 2n,
    },
  });

  expect(await tester.read()).toEqual({
    type: 'sleep',
  });
});

it('should read [event,event,event,fork,event,event,sleep]', async () => {
  await hardhat.client.mine({ blocks: 1 });
  const snapshotId = await hardhat.client.snapshot();
  await hardhat.client.mine({ blocks: 1 });

  const tester = new StreamTester(stream, {
    usi: stream.usi,
    from: 0,
  });
  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      number: 0n,
    },
    data: {
      number: 0n,
    },
  });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      number: 1n,
    },
    data: {
      number: 1n,
    },
  });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      number: 2n,
    },
    data: {
      number: 2n,
    },
  });

  await hardhat.client.revert({ id: snapshotId });
  await hardhat.client.request({
    method: 'hardhat_setCoinbase' as any,
    params: ['0x0000000000000000000000000000000000000000'],
  });
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
    data: {
      number: 2n,
    },
  });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      number: 3n,
    },
    data: {
      number: 3n,
    },
  });

  expect(await tester.read()).toEqual({
    type: 'sleep',
  });
});

it('should read [sleep,event,event,sleep] from block 3', async () => {
  const tester = new StreamTester(stream, {
    usi: stream.usi,
    from: 3,
  });

  expect(await tester.read()).toMatchObject({
    type: 'sleep',
  });

  await hardhat.client.mine({ blocks: 4 });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      number: 3n,
    },
    data: {
      number: 3n,
    },
  });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      number: 4n,
    },
    data: {
      number: 4n,
    },
  });

  expect(await tester.read()).toMatchObject({
    type: 'sleep',
  });
});

it('should read [event,event,event,completed] from block 1 to 3', async () => {
  await hardhat.client.mine({ blocks: 5 });
  const tester = new StreamTester(stream, {
    usi: stream.usi,
    from: 1,
    to: 3,
  });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      number: 1n,
    },
    data: {
      number: 1n,
    },
  });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      number: 2n,
    },
    data: {
      number: 2n,
    },
  });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      number: 3n,
    },
    data: {
      number: 3n,
    },
  });

  expect(await tester.read()).toMatchObject({
    type: 'completed',
  });
});
