import { z } from 'zod';

import { internalProcedure, router } from '../trpc';

export const internalRouter = router({
  ProbeStartup: internalProcedure
    .meta({
      openapi: {
        enabled: false,
        method: 'GET',
        path: '/probeStartup',
        tags: ['probes'],
      },
    })
    .input(z.void())
    .output(z.boolean())
    .query(() => {
      return true;
    }),
  ProbeLiveness: internalProcedure
    .meta({
      openapi: {
        enabled: false,
        method: 'GET',
        path: '/probeLiveness',
        tags: ['probes'],
      },
    })
    .input(z.void())
    .output(z.boolean())
    .query(() => {
      return true;
    }),
  ProbeReadiness: internalProcedure
    .meta({
      openapi: {
        enabled: false,
        method: 'GET',
        path: '/probeReadiness',
        tags: ['probes'],
      },
    })
    .input(z.void())
    .output(z.boolean())
    .query(async ({ ctx: { getDb } }) => {
      await getDb().selectFrom('Program').select(['programId']).executeTakeFirst();
      return true;
    }),
});
