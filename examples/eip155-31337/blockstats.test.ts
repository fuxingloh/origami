import { CFTestcontainers } from '@chainfile/testcontainers';
import { unpack } from '@fuxingloh/origami/client';
import { ImagiroTestcontainers, StartedImagiroTestcontainers } from '@imagiro/imagiro-testcontainers';
import { afterAll, beforeAll, expect, it } from '@jest/globals';
import HardhatDefinition from 'chainfile-hardhat/hardhat.json';

let imagiro: StartedImagiroTestcontainers;
let chainfile: CFTestcontainers;

beforeAll(async () => {
  chainfile = new CFTestcontainers(HardhatDefinition);
  await chainfile.start();

  imagiro = await new ImagiroTestcontainers()
    .withUSI('eip155:31337/block', {
      endpoint: chainfile.get('hardhat').getHostEndpoint('rpc', 'host.docker.internal'),
    })
    .start();
});

afterAll(async () => {
  await Promise.all([chainfile.stop(), imagiro.stop()]);
});

it('should deploy blockstats.origami.ts', async () => {
  const { programId } = await imagiro.deploy(__dirname, 'blockstats.origami.ts');
  await chainfile.get('hardhat').rpc({ method: 'hardhat_mine', params: ['0x3'] });
  await imagiro.waitForStream(programId, 3);

  const result = await imagiro.client.rpc.streamQuery({
    programId: programId,
    reverse: false,
    limit: 3,
  });

  expect(unpack(result)).toMatchObject({
    data: [
      {
        data: {
          difficulty: 0n,
          number: 0n,
          hash: expect.any(String),
        },
        sort: expect.any(String),
        hash: expect.any(String),
        n: 0,
      },
      {
        data: {
          number: 2n,
          custom: expect.any(String),
        },
        sort: expect.any(String),
        hash: expect.any(String),
        n: 0,
      },
      {
        data: {
          difficulty: 0n,
          number: 3n,
          hash: expect.any(String),
        },
        sort: expect.any(String),
        hash: expect.any(String),
        n: 0,
      },
    ],
    cursors: {
      before: expect.stringMatching(/^[A-Za-z0-9_-]+$/),
      after: expect.stringMatching(/^[A-Za-z0-9_-]+$/),
    },
  });
});
