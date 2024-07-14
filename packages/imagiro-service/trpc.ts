import type { Db } from '@imagiro/imagiro-data';
import { initTRPC } from '@trpc/server';
import type { OpenApiMeta } from 'trpc-openapi';

import { createAuthorizationMiddleware } from './auth';

export interface Context {
  getDb: () => Db;
  req: {
    authorization: string | undefined;
  };
}

const t = initTRPC.meta<OpenApiMeta>().context<Context>().create();

export const router = t.router;

export const createCallerFactory = t.createCallerFactory;

export const internalProcedure = t.procedure;

export const authorizedProcedure = t.procedure.use(createAuthorizationMiddleware());
