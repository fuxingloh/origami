import { CFContainer, CFTestcontainers } from '@chainfile/testcontainers';
import { StreamTester } from '@imagiro/stream-core/tester';
import { afterEach, beforeEach, expect, it } from '@jest/globals';
import BitcoindRegtest from 'chainfile-bitcoin/regtest.json';

import { BIP122TxStream } from './tx';

let chainfile: CFTestcontainers;
let bitcoind: CFContainer;
let stream: BIP122TxStream;

beforeEach(async () => {
  chainfile = new CFTestcontainers(BitcoindRegtest);
  await chainfile.start();
  bitcoind = chainfile.get('bitcoind');
  stream = new BIP122TxStream('bip122:0/tx', {
    endpoint: chainfile.get('bitcoind').getHostEndpoint('rpc'),
    headers: chainfile.get('bitcoind').getAuthHeaders('rpc'),
  });
});

afterEach(async () => {
  await chainfile.stop();
});

it('should read [event,event,event,sleep]', async () => {
  await bitcoind.rpc({ method: 'createwallet', params: ['test'] });
  const address = await bitcoind.rpc({ method: 'getnewaddress' }).then((r) => r.json().then((r: any) => r.result));
  await bitcoind.rpc({ method: 'generatetoaddress', params: [101, address] }).then((r) => r.json());

  await bitcoind.rpc({
    method: 'sendtoaddress',
    params: ['bcrt1q4u4nsgk6ug0sqz7r3rj9tykjxrsl0yy4d0wwte', 1.23456789],
  });
  await bitcoind.rpc({
    method: 'generatetoaddress',
    params: [2, address],
  });

  const tester = new StreamTester(stream, {
    usi: stream.usi,
    from: 101,
  });
  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      height: 101,
    },
    data: [
      {
        txid: expect.any(String),
      },
    ],
  });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      height: 102,
    },
    data: [
      {
        txid: expect.any(String),
        vin: [{ coinbase: expect.any(String), sequence: expect.any(Number) }],
        vout: [
          { n: 0, value: expect.any(Number) },
          { n: 1, value: 0 },
        ],
      },
      {
        txid: expect.any(String),
        version: 2,
        vin: [
          {
            sequence: expect.any(Number),
            txid: expect.any(String),
            vout: expect.any(Number),
          },
        ],
        vout: expect.arrayContaining([expect.objectContaining({ value: 1.23456789 })]),
      },
    ],
  });

  expect(await tester.read()).toMatchObject({
    type: 'event',
    header: {
      hash: expect.any(String),
      height: 103,
    },
    data: [{ txid: expect.any(String) }],
  });

  expect(await tester.read()).toEqual({
    type: 'sleep',
  });
});
