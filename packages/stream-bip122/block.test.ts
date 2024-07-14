import { CFContainer, CFTestcontainers } from '@chainfile/testcontainers';
import { StreamTester } from '@imagiro/stream-core/tester';
import { afterEach, beforeEach, expect, it } from '@jest/globals';
import BitcoindRegtest from 'chainfile-bitcoin/regtest.json';

import { BIP122BlockStream } from './block';

let chainfile: CFTestcontainers;
let bitcoind: CFContainer;
let stream: BIP122BlockStream;

beforeEach(async () => {
  chainfile = new CFTestcontainers(BitcoindRegtest);
  await chainfile.start();
  bitcoind = chainfile.get('bitcoind');
  stream = new BIP122BlockStream('bip122:0/block', {
    endpoint: chainfile.get('bitcoind').getHostEndpoint('rpc'),
    headers: chainfile.get('bitcoind').getAuthHeaders('rpc'),
  });
});

afterEach(async () => {
  await chainfile.stop();
});

it('should read [event,event,event,sleep]', async () => {
  await bitcoind.rpc({ method: 'generatetoaddress', params: [2, 'bcrt1q4u4nsgk6ug0sqz7r3rj9tykjxrsl0yy4d0wwte'] });

  const tester = new StreamTester(stream, {
    usi: stream.usi,
    from: 0,
  });
  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: '0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206',
      height: 0,
    },
    data: {
      height: 0,
    },
  });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      height: 1,
    },
    data: {
      height: 1,
    },
  });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      height: 2,
    },
    data: {
      height: 2,
    },
  });

  expect(await tester.read()).toEqual({
    type: 'sleep',
  });
});

it('should read [event,event,event,fork,event,event,sleep]', async () => {
  await bitcoind.rpc({ method: 'generatetoaddress', params: [2, 'bcrt1q4u4nsgk6ug0sqz7r3rj9tykjxrsl0yy4d0wwte'] });

  const tester = new StreamTester(stream, {
    usi: stream.usi,
    from: 0,
  });
  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: '0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206',
      height: 0,
    },
    data: {
      height: 0,
    },
  });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      height: 1,
    },
    data: {
      height: 1,
    },
  });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      height: 2,
    },
    data: {
      height: 2,
    },
  });

  const checkpoint = await tester.getCheckpoint();
  await bitcoind.rpc({ method: 'invalidateblock', params: [checkpoint?.hash] });
  await bitcoind.rpc({
    method: 'generatetoaddress',
    params: [2, 'bcrt1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3xueyj'],
  });

  expect(await tester.read()).toMatchObject({
    type: 'fork',
    header: {
      hash: expect.any(String),
      height: 2,
    },
  });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      height: 2,
    },
    data: {
      height: 2,
    },
  });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      height: 3,
    },
    data: {
      height: 3,
    },
  });

  expect(await tester.read()).toEqual({
    type: 'sleep',
  });
});

it('should read [event,event] from block 5', async () => {
  await bitcoind.rpc({ method: 'generatetoaddress', params: [10, 'bcrt1q4u4nsgk6ug0sqz7r3rj9tykjxrsl0yy4d0wwte'] });

  const tester = new StreamTester(stream, {
    usi: stream.usi,
    from: 5,
  });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      height: 5,
    },
    data: {
      height: 5,
    },
  });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      height: 6,
    },
    data: {
      height: 6,
    },
  });
});

it('should read [event,event,event,event,completed] from block 1 to 4', async () => {
  await bitcoind.rpc({ method: 'generatetoaddress', params: [10, 'bcrt1q4u4nsgk6ug0sqz7r3rj9tykjxrsl0yy4d0wwte'] });

  const tester = new StreamTester(stream, {
    usi: stream.usi,
    from: 1,
    to: 4,
  });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      height: 1,
    },
    data: {
      height: 1,
    },
  });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      height: 2,
    },
    data: {
      height: 2,
    },
  });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      height: 3,
    },
    data: {
      height: 3,
    },
  });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      height: 4,
    },
    data: {
      height: 4,
    },
  });

  expect(await tester.read()).toMatchObject({
    type: 'completed',
  });
});
