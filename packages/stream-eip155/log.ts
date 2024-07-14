import { EIP155LogConfig, EIP155Logs } from '@fuxingloh/origami-program/types';
import { NextSignal, z } from '@imagiro/stream-core';
import ERC20 from '@openzeppelin/contracts/build/contracts/ERC20.json';
import { type HttpTransport, type PublicClient } from 'viem';

import { EIP155Header, EIP155Stream } from './eip155';

export class EIP155LogStream extends EIP155Stream<EIP155Logs, EIP155LogConfig> {
  constructor(usi: string, viem: PublicClient<HttpTransport>) {
    super(usi, viem);
  }

  dataParser = z.array(
    z.object({
      eventName: z.string(),
      args: z.record(z.string(), z.unknown()),
      logIndex: z.number(),
      transactionIndex: z.number(),
      transactionHash: z.string(),
      blockHash: z.string(),
      blockNumber: z.bigint(),
      address: z.string(),
      data: z.string(),
      topics: z.array(z.string()),
    }),
  );

  public async getNext(config: EIP155LogConfig, prev: EIP155Header): Promise<NextSignal<EIP155Header, EIP155Logs>> {
    const block = await this.getBlock(prev.number + 1n);
    if (block === undefined) {
      return this.sleep();
    }

    if (block.parentHash !== prev.hash) {
      return this.fork({ header: prev });
    }

    if (config.to !== undefined && prev.number >= BigInt(config.to)) {
      return this.completed();
    }

    // TODO(?): this could be significantly modified to improve performance, e.g. you could:
    //   Use range (fromBlock, toBlock) to search beyond the next block
    //   But generally you have to be careful when returning multiple logs from different blocks
    //   as the event signal must only contain logs from the same block.
    //   A variety of caching mechanism can be deployed to jump over blocks without logs.

    const logs = await this.getLogs({
      config,
      blockHash: block.hash!,
    });

    if (logs.length > 0) {
      return this.event({
        header: {
          hash: block.hash!,
          number: block.number!,
        },
        data: logs,
        sequence: block.number!,
        timestamp: Number(block.timestamp!),
      });
    } else {
      return this.header({
        header: {
          hash: block.hash!,
          number: block.number!,
        },
        sequence: block.number!,
      });
    }
  }

  private async getLogs(options: { config: EIP155LogConfig; blockHash: string }): Promise<EIP155Logs> {
    const events = await this.viem.getContractEvents({
      abi: getAbi(options.config),
      eventName: options.config.event,
      address: options.config.address as `0x${string}` | undefined,
      args: options.config.args,
      blockHash: options.blockHash as `0x${string}` | undefined,
    });
    return events as any[];
  }
}

function getAbi(config: EIP155LogConfig): unknown[] {
  if (config.abi === 'erc20') {
    return ERC20.abi;
  }
  return config.abi;
}
