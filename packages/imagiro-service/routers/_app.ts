import { createCallerFactory, router } from '../trpc';
import { internalRouter } from './probes';
import { programRouter } from './program';
import { streamRouter } from './stream';

export const appRouter = router({
  Program: programRouter,
  Stream: streamRouter,
  Internal: internalRouter,
});

export const createCaller = createCallerFactory(appRouter);
