import { CFTestcontainers } from '@chainfile/testcontainers';
import { unpack } from '@fuxingloh/origami/client';
import { ImagiroTestcontainers, StartedImagiroTestcontainers } from '@imagiro/imagiro-testcontainers';
import { afterAll, beforeAll, expect, it } from '@jest/globals';
import BitcoindRegtest from 'chainfile-bitcoin/regtest.json';
import HardhatDefinition from 'chainfile-hardhat/hardhat.json';

let hardhat: CFTestcontainers;
let bitcoind: CFTestcontainers;
let imagiro: StartedImagiroTestcontainers;

beforeAll(async () => {
  hardhat = new CFTestcontainers(HardhatDefinition);
  await hardhat.start();

  bitcoind = new CFTestcontainers(BitcoindRegtest);
  await bitcoind.start();

  imagiro = await new ImagiroTestcontainers()
    .withUSI('eip155:31337/block', {
      endpoint: hardhat.get('hardhat').getHostEndpoint('rpc', 'host.docker.internal'),
    })
    .withUSI('bip122:0f9188f13cb7b2c71f2a335e3a4fc328/block', {
      endpoint: bitcoind.get('bitcoind').getHostEndpoint('rpc', 'host.docker.internal'),
      headers: bitcoind.get('bitcoind').getAuthHeaders('rpc'),
    })
    .start();
});

afterAll(async () => {
  await Promise.all([hardhat.stop(), bitcoind.stop(), imagiro.stop()]);
});

it('should deploy blocks.origami.ts', async () => {
  const programId = await imagiro.deploy(__dirname, 'blocks.origami.ts').then((p) => p.programId);
  await hardhat.get('hardhat').rpc({ method: 'hardhat_mine', params: ['0x3'] });
  await bitcoind.get('bitcoind').rpc({
    method: 'generatetoaddress',
    params: [3, 'bcrt1q4u4nsgk6ug0sqz7r3rj9tykjxrsl0yy4d0wwte'],
  });

  await imagiro.waitForStream(programId, 8);

  const result = await imagiro.client.rpc.streamQuery({
    programId: programId,
  });

  const data = unpack(result).data;
  expect(data.filter((i: any) => i.data.type === 'bitcoin').length).toBeGreaterThan(3);
  expect(data.filter((i: any) => i.data.type === 'hardhat').length).toBeGreaterThan(3);
});
