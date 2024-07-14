import { unpack } from '@fuxingloh/origami/client';
import { ImagiroTestcontainers, StartedImagiroTestcontainers } from '@imagiro/imagiro-testcontainers';
import { afterAll, beforeAll, expect, it } from '@jest/globals';
import Token from '@workspace/solidity/contracts/Token.sol/Token.json';
import { HardhatContainer, StartedHardhatContainer } from 'hardhat-testcontainers';
import { getContract, getContractAddress } from 'viem';

let imagiro: StartedImagiroTestcontainers;
let earth: StartedHardhatContainer;
let water: StartedHardhatContainer;

beforeAll(async () => {
  earth = await new HardhatContainer().withMiningAuto(false).withMiningInterval(0).start();
  water = await new HardhatContainer().withMiningAuto(false).withMiningInterval(0).start();
  imagiro = await new ImagiroTestcontainers()
    .withUSI('eip155:31337/log', {
      endpoint: earth.getHostRpcEndpoint('host.docker.internal'),
    })
    .withUSI('eip155:1337/log', {
      endpoint: water.getHostRpcEndpoint('host.docker.internal'),
    })
    .start();
});

afterAll(async () => {
  await Promise.all([earth.stop(), imagiro.stop()]);
});

async function deployContract(container: StartedHardhatContainer, account: `0x${string}`) {
  const hash = await container.client.deployContract({
    abi: Token.abi,
    bytecode: Token.bytecode as `0x${string}`,
    args: ['USDT Coin', 'USDT', 1n],
    account: account,
  });
  await container.client.mine({ blocks: 1 });

  const transaction = await container.client.getTransaction({ hash: hash });
  return getContract({
    address: getContractAddress({ from: transaction.from, nonce: BigInt(transaction.nonce) }),
    abi: Token.abi,
    client: {
      public: container.client,
      wallet: container.client,
    },
  });
}

it('should test log stream from multiple chain [earth,water]', async () => {
  const [earth1, earth2, earth3] = await earth.client.getAddresses();
  const [water1, water2, water3] = await earth.client.getAddresses();
  const earthContract = await deployContract(earth, earth1);
  expect(earthContract.address).toStrictEqual('0x5FbDB2315678afecb367f032d93F642f64180aa3');

  await water.client.mine({ blocks: 2 });
  const waterContract = await deployContract(water, water2);
  expect(waterContract.address).toStrictEqual('0x8464135c8F25Da09e49BC8782676a84730C318bC');

  await earthContract.write.transfer([earth2, 1n], { account: earth1 });
  await earthContract.write.mint([earth2, 99n], { account: earth1 });
  const time = BigInt(Math.floor(Date.now() / 1000)) + 10000000n;
  await earth.client.setNextBlockTimestamp({ timestamp: time + 10n });
  await earth.client.mine({ blocks: 2 });

  await waterContract.write.mint([water2, 1n], { account: water2 });
  await waterContract.write.mint([water3, 2n], { account: water2 });
  await water.client.setNextBlockTimestamp({ timestamp: time + 20n });
  await water.client.mine({ blocks: 1 });

  await earthContract.write.mint([earth3, 500n], { account: earth1 });
  await earth.client.setNextBlockTimestamp({ timestamp: time + 30n });
  await earth.client.mine({ blocks: 2 });

  await waterContract.write.mint([water2, 10n], { account: water2 });
  await waterContract.write.mint([water1, 19n], { account: water2 });
  await waterContract.write.transfer([water3, 10n], { account: water2 });
  await water.client.setNextBlockTimestamp({ timestamp: time + 40n });
  await water.client.mine({ blocks: 1 });

  const { programId } = await imagiro.deploy(__dirname, 'usdt.origami.ts');
  await imagiro.waitForStream(programId, 6);

  const result = await imagiro.client.rpc.streamQuery({
    programId: programId,
    reverse: false,
  });

  expect(unpack(result)).toMatchObject({
    data: [
      {
        data: {
          to: earth2,
          amount: 99n,
        },
      },
      {
        data: {
          to: water2,
          amount: 1n,
        },
      },
      {
        data: {
          to: water3,
          amount: 2n,
        },
      },
      {
        data: {
          to: earth3,
          amount: 500n,
        },
      },
      {
        data: {
          to: water2,
          amount: 10n,
        },
      },
      {
        data: {
          to: water1,
          amount: 19n,
        },
      },
    ],
  });
});
