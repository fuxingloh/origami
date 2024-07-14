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

it('should deploy from-to.origami.ts', async () => {
  const programId = await imagiro.deploy(__dirname, 'from-to.origami.ts').then((p) => p.programId);
  await bitcoind.get('bitcoind').rpc({
    method: 'generatetoaddress',
    params: [20, 'bcrt1q4u4nsgk6ug0sqz7r3rj9tykjxrsl0yy4d0wwte'],
  });

  await imagiro.waitForStream(programId, 11);

  const result = await imagiro.client.rpc.streamQuery({
    programId: programId,
  });

  expect(unpack(result)).toMatchObject({
    data: [
      {
        data: { height: 15n },
      },
      {
        data: { height: 14n },
      },
      {
        data: { height: 13n },
      },
      {
        data: { height: 12n },
      },
      {
        data: { height: 11n },
      },
      {
        data: { height: 10n },
      },
      {
        data: { height: 5n },
      },
      {
        data: { height: 4n },
      },
      {
        data: { height: 3n },
      },
      {
        data: { height: 2n },
      },
      {
        data: { height: 1n },
      },
    ],
    cursors: {
      before: expect.any(String),
      after: expect.any(String),
    },
  });
});
