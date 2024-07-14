import { unpack } from '@fuxingloh/origami/client';
import { ImagiroTestcontainers, StartedImagiroTestcontainers } from '@imagiro/imagiro-testcontainers';
import { afterAll, beforeAll, expect, it } from '@jest/globals';
import { HardhatContainer, StartedHardhatContainer } from 'hardhat-testcontainers';

let imagiro: StartedImagiroTestcontainers;
let hardhat: StartedHardhatContainer;
let programId: string;

beforeAll(async () => {
  hardhat = await new HardhatContainer().withMiningAuto(false).withMiningInterval(0).start();
  imagiro = await new ImagiroTestcontainers()
    .withUSI('eip155:31337/block', {
      endpoint: hardhat.getHostRpcEndpoint('host.docker.internal'),
    })
    .start();

  programId = await imagiro.deploy(__dirname, 'group.origami.ts').then((p) => p.programId);
  const [address1, address2, address3] = await hardhat.client.getAddresses();

  await hardhat.client.setCoinbase({ address: address1 });
  await hardhat.client.mine({ blocks: 1, interval: 1 });
  await hardhat.client.setCoinbase({ address: address2 });
  await hardhat.client.mine({ blocks: 2, interval: 1 });
  await hardhat.client.setCoinbase({ address: address3 });
  await hardhat.client.mine({ blocks: 3, interval: 1 });

  await imagiro.waitForStream(programId, 7);
});

afterAll(async () => {
  await Promise.all([hardhat.stop(), imagiro.stop()]);
});

it('should query stream via $group', async () => {
  const [address1, address2, address3] = await hardhat.client.getAddresses();

  const result0 = await imagiro.client.rpc.streamQuery({
    programId: programId,
    group: '0x0000000000000000000000000000000000000000',
  });

  expect(unpack(result0)).toMatchObject({
    data: [
      {
        data: {
          $group: '0x0000000000000000000000000000000000000000',
          miner: '0x0000000000000000000000000000000000000000',
          number: 0n,
        },
      },
    ],
  });

  const result1 = await imagiro.client.rpc.streamQuery({
    programId: programId,
    group: address1.toLowerCase(),
  });

  expect(unpack(result1)).toMatchObject({
    data: [
      {
        data: {
          $group: address1.toLowerCase(),
          miner: address1.toLowerCase(),
          number: 1n,
        },
      },
    ],
  });

  const result2 = await imagiro.client.rpc.streamQuery({
    programId: programId,
    group: address2.toLowerCase(),
  });

  expect(unpack(result2)).toMatchObject({
    data: [
      {
        data: {
          $group: address2.toLowerCase(),
          miner: address2.toLowerCase(),
          number: 3n,
        },
      },
      {
        data: {
          $group: address2.toLowerCase(),
          miner: address2.toLowerCase(),
          number: 2n,
        },
      },
    ],
  });

  const result3 = await imagiro.client.rpc.streamQuery({
    programId: programId,
    group: address3.toLowerCase(),
  });

  expect(unpack(result3)).toMatchObject({
    data: [
      {
        data: {
          $group: address3.toLowerCase(),
          miner: address3.toLowerCase(),
          number: 6n,
        },
      },
      {
        data: {
          $group: address3.toLowerCase(),
          miner: address3.toLowerCase(),
          number: 5n,
        },
      },
      {
        data: {
          $group: address3.toLowerCase(),
          miner: address3.toLowerCase(),
          number: 4n,
        },
      },
    ],
  });
});

it('should query stream via $group and paginate', async () => {
  const [, , address3] = await hardhat.client.getAddresses();

  const page1 = await imagiro.client.rpc.streamQuery({
    programId: programId,
    group: address3.toLowerCase(),
    limit: 2,
  });

  expect(unpack(page1)).toMatchObject({
    data: [
      {
        data: {
          $group: address3.toLowerCase(),
          miner: address3.toLowerCase(),
          number: 6n,
        },
        sort: expect.any(String),
        hash: expect.any(String),
        n: 0,
      },
      {
        data: {
          $group: address3.toLowerCase(),
          miner: address3.toLowerCase(),
          number: 5n,
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

  const page2 = await imagiro.client.rpc.streamQuery({
    programId: programId,
    group: address3.toLowerCase(),
    limit: 2,
    after: page1.cursors.after,
  });

  expect(unpack(page2)).toMatchObject({
    data: [
      {
        data: {
          $group: address3.toLowerCase(),
          miner: address3.toLowerCase(),
          number: 4n,
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
