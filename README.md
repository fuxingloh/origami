# Origami

> This is an **experimental** project which explores a serverless indexer architecture
> for processing multi-chain events in near real-time for OLAP uses.

Origami is a framework and runtime for processing and indexing multi-chain events in near real-time using a serverless architecture for OLAP uses.

Using a familiar typescript-like language, developers can easily write "index" function and ingest multi-chain events that follow the stream processing semantics (unbounded data, event-time processing, at-least-once, eventually-consistent) without having to provision any compute. The indexed data stream can be queried to build real-time experiences or streamed to another OLAP platform.

## Motivation

While working on blockchain protocols for various projects, I found that indexing blockchain events was a common pain that was solved repeatedly. Writing the solidity contract to emit events is easy, but processing these events in a scalable and reliable manner is challenging. You must deal with chain re-org, chain forks, out-of-order events, and scaling the infrastructure to handle the load.

Spoiled with Vercel, Netlify, and Cloud/Edge Functions/Workers like AWS Lambda, where you don't have to worry about provisioning the underlying
infrastructure, I wanted the same experience for blockchain event processing. Compose your index function within minutes, deploy it with a single command, and you have a planet-scale API to use. Or, just like Vercel and Netlify, let GitOps handle everything for you without worrying about the lifecycle or deployment. Make your change, commit, and push; you will have a newly deployed stream without downtime.

There isn't quite a cut-and-dry solution to this problem, and hence, the exploration and experimentation with an indexer architecture that can remove the headache and complexity of processing multi-chain events.

Hence, the motivation drives these design principles:

- Serverless: No need to provision compute yourself for processing multi-chain events. Workers can automatically be scaled based on load.
- Multi-chain: Support ingesting events from multiple chains and processing them in a single pipeline.
- Adapter-based: Easily add support for new chains by writing an adapter.
- Graceful re-org: Support for chain re-org and chain forks without writing your logic.
- Simple DSL: Write your index function in a familiar typescript-like language without worrying about the underlying code execution.
- Bundling: Automatically bundle your index code and dependencies into a single package for execution. BYO dependencies or ABI, and it will be packaged for you.
- Event-time semantics: Automatically sequence events based on event-time processing semantics with the ability to handle out-of-order events.
- At-least-once: Guarantees that events are processed at least once.
- Eventually-consistent: Guarantees that the indexed data stream will eventually be consistent with the source data stream.
- Smart re-indexing: Easily update your index function without re-indexing the entire dataset.

## Usage

E.g. Indexing ERC20 Transfer events from Ethereum.

```ts
// Filename: erc20.origami.ts
import { EIP155Logs, Return, Subscribe } from '@fuxingloh/origami/program';

export const subscribe: Subscribe = [
  {
    usi: 'eip155:31337/log',
    address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    abi: 'erc20',
    event: 'Transfer',
  },
];

export function map(logs: EIP155Logs): Return {
  return logs.map((log) => {
    return {
      block: {
        hash: log.blockHash,
        number: log.blockNumber,
      },
      transaction: {
        hash: log.transactionHash,
      },
      from: log.args.from as string,
      to: log.args.to as string,
      quantity: log.args.value as bigint,
    };
  });
}
```

Deploy the index function to the Origami runtime.

```sh
origami deploy erc20.origami.ts
```

Query the indexed data stream.

```ts
const result = await client.rpc.streamQuery({ programId: programId });

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
  ],
  cursors: {
    before: expect.any(String),
    after: expect.any(String),
  },
});
```

That's it! You have successfully indexed ERC20 Transfer events from Ethereum.

For multi-chain, it's as simple as subscribing to multiple chains in the `subscribe` array.
This could be any event from any chain, bitcoin or ethereum, it doesn't matter.
For more examples, check out the `examples` directory with E2E tests covering various scenarios.

```ts
// Filename: blocks.origami.ts
import { BIP122Block, EIP155Block, Subscribe } from '@fuxingloh/origami/program';

export const subscribe: Subscribe = [
  { usi: 'eip155:31337/block' },
  { usi: 'bip122:0f9188f13cb7b2c71f2a335e3a4fc328/block' },
];

export function map(block: EIP155Block | BIP122Block, event: Event) {
  if (event.usi === 'eip155:31337/block') {
    const hardhat = block as EIP155Block;
    return {
      type: 'hardhat',
      hash: hardhat.hash,
      number: hardhat.number,
    };
  }

  if (event.usi === 'bip122:0f9188f13cb7b2c71f2a335e3a4fc328/block') {
    const bitcoin = block as BIP122Block;
    return {
      type: 'bitcoin',
      hash: bitcoin.hash,
      number: BigInt(bitcoin.height),
    };
  }

  return undefined;
}
```

## Project Layout & Development Guide

```txt
├── examples            < kitchen sink
├── packages
│   ├── imagiro-*       < project backend
│   ├── origami-*       < project frontend
│   └── stream-*        < blockchain stream adapters
└── workspace           < workspace only packages
```

Split across 3 concerns in the `packages` directory.
Each package prefixed with their corresponding concern.

Origami is the frontend to the project which is responsible for user land features.
This includes the bundling of the index code and dependencies,
CLI for deploying functions, OpenAPI and client for querying the indexed data stream.

Imagiro (origami spelled backwards) is the backend project which is responsible for the actual stream processing.
The data and control plane of the project.

Stream packages are adapters for ingesting events from different chains into a standardized format.
Re-org and fork handling is done here.

## License

MIT and highly experimental. Use at your own risk.
