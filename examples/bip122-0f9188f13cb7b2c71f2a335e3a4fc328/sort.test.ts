import { CFTestcontainers } from '@chainfile/testcontainers';
import { unpack } from '@fuxingloh/origami/client';
import { ImagiroTestcontainers, StartedImagiroTestcontainers } from '@imagiro/imagiro-testcontainers';
import { afterAll, beforeAll, expect, it } from '@jest/globals';
import BitcoindRegtest from 'chainfile-bitcoin/regtest.json';

let bitcoind: CFTestcontainers;
let imagiro: StartedImagiroTestcontainers;

beforeAll(async () => {
  bitcoind = new CFTestcontainers(BitcoindRegtest);
  await bitcoind.start();

  imagiro = await new ImagiroTestcontainers()
    .withUSI('bip122:0f9188f13cb7b2c71f2a335e3a4fc328/block', {
      endpoint: bitcoind.get('bitcoind').getHostEndpoint('rpc', 'host.docker.internal'),
      headers: bitcoind.get('bitcoind').getAuthHeaders('rpc'),
    })
    .start();
});

afterAll(async () => {
  await Promise.all([bitcoind.stop(), imagiro.stop()]);
});

it('should deploy sort.origami.ts', async () => {
  const programId = await imagiro.deploy(__dirname, 'sort.origami.ts').then((p) => p.programId);
  await bitcoind.get('bitcoind').rpc({
    method: 'generatetoaddress',
    params: [10, 'bcrt1q4u4nsgk6ug0sqz7r3rj9tykjxrsl0yy4d0wwte'],
  });

  await imagiro.waitForStream(programId, 22);

  const result = await imagiro.client.rpc.streamQuery({
    programId: programId,
    reverse: false,
    limit: 10,
  });

  expect(unpack(result)).toMatchObject({
    data: [
      {
        sort: '0',
        n: 0,
        data: {
          $sort: '0',
          type: 'top',
          height: 0n,
        },
      },
      {
        sort: '0',
        n: 1,
        data: {
          $sort: '0',
          type: 'bottom',
          height: 0n,
        },
      },
      {
        sort: '1',
        n: 0,
        data: {
          $sort: '1',
          type: 'top',
          height: 1n,
        },
      },
      {
        sort: '1',
        n: 1,
        data: {
          $sort: '1',
          type: 'bottom',
          height: 1n,
        },
      },
      {
        sort: '10',
        n: 0,
        data: {
          $sort: '10',
          type: 'top',
          height: 10n,
        },
      },
      {
        sort: '10',
        n: 1,
        data: {
          $sort: '10',
          type: 'bottom',
          height: 10n,
        },
      },
      {
        sort: '2',
        n: 0,
        data: {
          $sort: '2',
          type: 'top',
          height: 2n,
        },
      },
      {
        sort: '2',
        n: 1,
        data: {
          $sort: '2',
          type: 'bottom',
          height: 2n,
        },
      },
      {
        sort: '3',
        n: 0,
        data: {
          $sort: '3',
          type: 'top',
          height: 3n,
        },
      },
      {
        sort: '3',
        n: 1,
        data: {
          $sort: '3',
          type: 'bottom',
          height: 3n,
        },
      },
    ],
    cursors: {
      before: expect.any(String),
      after: expect.any(String),
    },
  });
});
