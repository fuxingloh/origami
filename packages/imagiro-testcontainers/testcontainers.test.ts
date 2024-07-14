import { CFTestcontainers } from '@chainfile/testcontainers';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import HardhatDefinition from 'chainfile-hardhat/hardhat.json';

import { ImagiroTestcontainers, StartedImagiroTestcontainers } from './testcontainers';

describe('start with chainfile', () => {
  let testcontainers: StartedImagiroTestcontainers;
  const chainfile = new CFTestcontainers(HardhatDefinition);

  beforeAll(async () => {
    await chainfile.start();

    testcontainers = await new ImagiroTestcontainers()
      .withUSI('eip155:31337/block', {
        endpoint: chainfile.get('hardhat').getHostEndpoint('rpc', 'host.docker.internal'),
      })
      .start();
  });

  afterAll(async () => {
    await Promise.all([testcontainers.stop(), chainfile.stop()]);
  });

  it('should get service endpoint', async () => {
    const endpoint = testcontainers.getServiceEndpoint();
    expect(endpoint).toMatch(/http:\/\/localhost:\d+/);
  });
});

describe('start without chainfile', () => {
  let testcontainers: StartedImagiroTestcontainers;

  beforeAll(async () => {
    testcontainers = await new ImagiroTestcontainers().start();
  });

  afterAll(async () => {
    await testcontainers.stop();
  });

  it('should get service endpoint', async () => {
    const endpoint = testcontainers.getServiceEndpoint();
    expect(endpoint).toMatch(/http:\/\/localhost:\d+/);
  });
});
