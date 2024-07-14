import { unpack } from '@fuxingloh/origami/client';
import { ImagiroTestcontainers, StartedImagiroTestcontainers } from '@imagiro/imagiro-testcontainers';
import { afterAll, beforeAll, expect, it } from '@jest/globals';
import Create2Deployer from '@workspace/solidity/contracts/Create2Deployer.sol/Create2Deployer.json';
import SimpleBank from '@workspace/solidity/contracts/SimpleBank.sol/SimpleBank.json';
import { HardhatContainer, StartedHardhatContainer } from 'hardhat-testcontainers';
import { getContract, getContractAddress } from 'viem';

let imagiro: StartedImagiroTestcontainers;
let hardhat: StartedHardhatContainer;
let programId: string;

beforeAll(async () => {
  hardhat = await new HardhatContainer().start();
  imagiro = await new ImagiroTestcontainers()
    .withUSI('eip155:31337/log', {
      endpoint: hardhat.getHostRpcEndpoint('host.docker.internal'),
    })
    .start();

  const [address0, address1, address2, address3] = await hardhat.client.getAddresses();

  await hardhat.client.deployContract({
    abi: Create2Deployer.abi,
    bytecode: Create2Deployer.bytecode as `0x${string}`,
    account: address0,
  });

  const deployer = getContractAddress({ from: address0, nonce: 0n });
  const deployerContract = getContract({
    address: deployer,
    abi: Create2Deployer.abi,
    client: hardhat.client,
  });

  const salt = '0xdb62930119546e9977d9b19c013df48f7cf72bc8161540d4b91ce59ff9a65de3';
  await deployerContract.write.deploy([SimpleBank.bytecode as `0x${string}`, salt], { account: address0 });

  const bankAddress = getContractAddress({
    opcode: 'CREATE2',
    from: deployer,
    bytecode: SimpleBank.bytecode as `0x${string}`,
    salt: salt,
  });
  expect(bankAddress).toStrictEqual('0x7C93C37Ba28F7f2ED1B1b8aD9330E28733303826');

  const bank: any = getContract({
    address: '0x7C93C37Ba28F7f2ED1B1b8aD9330E28733303826',
    abi: SimpleBank.abi,
    client: hardhat.client,
  });

  await bank.write.deposit({ account: address1, value: 10_000_000_000_000_000n });
  await bank.write.withdraw([1_000n], { account: address2 }).catch(() => {});

  await bank.write.deposit({ account: address2, value: 15_000_000_000_000_000n });
  await bank.write.deposit({ account: address2, value: 10_000_000_000_000_000n });
  await bank.write.deposit({ account: address3, value: 10_000_000_000_000_000n });
  await bank.write.deposit({ account: address3, value: 430_000_000_000_000_000n });
  await bank.write.deposit({ account: address2, value: 1_000_000n });
  await bank.write.deposit({ account: address2, value: 1_000_000n });
  await bank.write.deposit({ account: address3, value: 2_000_000n });
  await bank.write.deposit({ account: address3, value: 3_000_000n });
  await bank.write.deposit({ account: address3, value: 4_000_000n });
  await bank.write.withdraw([1_000n], { account: address3 });
  await bank.write.withdraw([2_000n], { account: address2 });
  await bank.write.withdraw([3_000n], { account: address1 });
  await bank.write.withdraw([1_000_000n], { account: address3 });

  const program = await imagiro.deploy(__dirname, 'simple-bank.origami.ts');
  await imagiro.waitForStream(program.programId, 10);
  programId = program.programId;
});

afterAll(async () => {
  await Promise.all([hardhat.stop(), imagiro.stop()]);
});

it('should get address0', async () => {
  const address = await hardhat.client.getAddresses().then((addresses) => addresses[0]);

  const result = await imagiro.client.rpc.streamQuery({
    programId: programId,
    group: address,
  });

  expect(unpack(result)).toMatchObject({
    data: [],
  });
});

it('should get address1', async () => {
  const address = await hardhat.client.getAddresses().then((addresses) => addresses[1]);

  const result = await imagiro.client.rpc.streamQuery({
    programId: programId,
    group: address,
  });

  expect(unpack(result)).toMatchObject({
    data: [
      {
        data: {
          type: 'withdraw',
          amount: 3_000n,
        },
      },
      {
        data: {
          type: 'deposit',
          amount: 10_000_000_000_000_000n,
        },
      },
    ],
  });
});

it('should get address2', async () => {
  const address = await hardhat.client.getAddresses().then((addresses) => addresses[2]);

  const result = await imagiro.client.rpc.streamQuery({
    programId: programId,
    group: address,
  });

  expect(unpack(result)).toMatchObject({
    data: [
      {
        data: {
          type: 'withdraw',
          amount: 2_000n,
        },
      },
      {
        data: {
          type: 'deposit',
          amount: 1_000_000n,
        },
      },
      {
        data: {
          type: 'deposit',
          amount: 1_000_000n,
        },
      },
      {
        data: {
          type: 'deposit',
          amount: 10_000_000_000_000_000n,
        },
      },
      {
        data: {
          type: 'deposit',
          amount: 15000000000000000n,
        },
      },
    ],
  });
});

it('should get address3', async () => {
  const address = await hardhat.client.getAddresses().then((addresses) => addresses[3]);

  const result = await imagiro.client.rpc.streamQuery({
    programId: programId,
    group: address,
  });

  expect(unpack(result)).toMatchObject({
    data: [
      {
        data: {
          type: 'withdraw',
          amount: 1_000_000n,
        },
      },
      {
        data: {
          type: 'withdraw',
          amount: 1_000n,
        },
      },
      {
        data: {
          type: 'deposit',
          amount: 4_000_000n,
        },
      },
      {
        data: {
          type: 'deposit',
          amount: 3_000_000n,
        },
      },
      {
        data: {
          type: 'deposit',
          amount: 2_000_000n,
        },
      },
      {
        data: {
          type: 'deposit',
          amount: 430_000_000_000_000_000n,
        },
      },
      {
        data: {
          type: 'deposit',
          amount: 10_000_000_000_000_000n,
        },
      },
    ],
  });
});
