# Origami

> This is an **experimental** project which explores a serverless indexer architecture
> for processing multi-chain events in near real-time for OLAP uses.

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
