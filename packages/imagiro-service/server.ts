import http from 'node:http';

import { initDb } from '@imagiro/imagiro-data';
import debug0 from 'debug';
import { createOpenApiHttpHandler } from 'trpc-openapi';

import { appRouter } from './routers/_app';
import type { Context } from './trpc';

const debug = debug0('imagiro:service');

async function start(): Promise<void> {
  const db = initDb();

  const server = http.createServer(
    createOpenApiHttpHandler({
      router: appRouter,
      createContext: ({ req }): Context => {
        return {
          getDb: () => db,
          req: {
            authorization: req.headers.authorization,
          },
        };
      },
      onError: (error) => {
        debug('TRPCError: %o', error);
      },
    }),
  );

  server.listen(3000);
}

void start();
