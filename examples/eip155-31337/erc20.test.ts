import { unpack } from '@fuxingloh/origami/client';
import { ImagiroTestcontainers, StartedImagiroTestcontainers } from '@imagiro/imagiro-testcontainers';
import { afterAll, beforeAll, expect, it } from '@jest/globals';
import Token from '@workspace/solidity/contracts/Token.sol/Token.json';
import { HardhatContainer, StartedHardhatContainer } from 'hardhat-testcontainers';
import { getContract, getContractAddress } from 'viem';

let imagiro: StartedImagiroTestcontainers;
let hardhat: StartedHardhatContainer;

beforeAll(async () => {
  hardhat = await new HardhatContainer().withMiningAuto(false).withMiningInterval(0).start();
  imagiro = await new ImagiroTestcontainers()
    .withUSI('eip155:31337/log', {
      endpoint: hardhat.getHostRpcEndpoint('host.docker.internal'),
    })
    .start();
});

afterAll(async () => {
  await Promise.all([hardhat.stop(), imagiro.stop()]);
});

it('should deploy erc20.origami.ts to test log stream', async () => {
  const [address1, address2, address3, address4] = await hardhat.client.getAddresses();
  const hash = await hardhat.client.deployContract({
    abi: Token.abi,
    bytecode: Token.bytecode as `0x${string}`,
    args: ['Token Name', 'TOK', 1000000000n],
    account: address1,
  });
  await hardhat.client.mine({ blocks: 1 });

  const transaction = await hardhat.client.getTransaction({ hash: hash });
  const contract = getContract({
    address: getContractAddress({ from: transaction.from, nonce: BigInt(transaction.nonce) }),
    abi: Token.abi,
    client: {
      public: hardhat.client,
      wallet: hardhat.client,
    },
  });
  expect(contract.address).toStrictEqual('0x5FbDB2315678afecb367f032d93F642f64180aa3');

  // Block: 2
  await contract.write.transfer([address2, 99n], { account: address1 });
  await contract.write.transfer([address3, 3195n], { account: address1 });
  await contract.write.transfer([address4, 1000000n], { account: address1 });
  await hardhat.client.mine({ blocks: 2 });

  // Block: 4
  await contract.write.transfer([address4, 55n], { account: address2 });
  await hardhat.client.mine({ blocks: 1 });

  // Block: 5 (Only 2 logs, 1 will fail)
  await contract.write.transfer([address4, 55n], { account: address1 });
  await contract.write.transfer([address4, 55n], { account: address2 }).catch(() => {});
  await contract.write.transfer([address4, 55n], { account: address3 });
  await hardhat.client.mine({ blocks: 1 });

  // Block: 6
  await contract.write.transfer([address3, 99n], { account: address4 });
  await hardhat.client.mine({ blocks: 1 });

  const { programId } = await imagiro.deploy(__dirname, 'erc20.origami.ts');
  await imagiro.waitForStream(programId, 8);

  const result = await imagiro.client.rpc.streamQuery({
    programId: programId,
  });

  expect(unpack(result)).toMatchObject({
    data: [
      {
        n: 0,
        data: {
          block: {
            hash: expect.any(String),
            number: 6n,
          },
          transaction: {
            hash: expect.any(String),
          },
          from: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
          quantity: 99n,
          to: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        },
      },
      {
        n: 1,
        data: {
          block: {
            hash: expect.any(String),
            number: 5n,
          },
          transaction: {
            hash: expect.any(String),
          },
          from: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
          quantity: 55n,
          to: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        },
      },
      {
        n: 0,
        data: {
          block: {
            hash: expect.any(String),
            number: 5n,
          },
          transaction: {
            hash: expect.any(String),
          },
          from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          quantity: 55n,
          to: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        },
      },
      {
        n: 0,
        data: {
          block: {
            hash: expect.any(String),
            number: 4n,
          },
          transaction: {
            hash: expect.any(String),
          },
          from: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
          quantity: 55n,
          to: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        },
      },
      {
        n: 2,
        data: {
          block: {
            hash: expect.any(String),
            number: 2n,
          },
          transaction: {
            hash: expect.any(String),
          },
          from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          quantity: 1000000n,
          to: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        },
      },
      {
        n: 1,
        data: {
          block: {
            hash: expect.any(String),
            number: 2n,
          },
          transaction: {
            hash: expect.any(String),
          },
          from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          quantity: 3195n,
          to: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        },
      },
      {
        n: 0,
        data: {
          block: {
            hash: expect.any(String),
            number: 2n,
          },
          transaction: {
            hash: expect.any(String),
          },
          from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          quantity: 99n,
          to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        },
      },
      {
        n: 0,
        data: {
          block: {
            hash: expect.any(String),
            number: 1n,
          },
          transaction: {
            hash: expect.any(String),
          },
          from: '0x0000000000000000000000000000000000000000',
          quantity: 1000000000n,
          to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        },
      },
    ],
    cursors: {
      before: expect.stringMatching(/^[A-Za-z0-9_-]+$/),
      after: expect.stringMatching(/^[A-Za-z0-9_-]+$/),
    },
  });
});
