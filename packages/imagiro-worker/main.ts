import { initDb } from '@imagiro/imagiro-data';
import { StreamRegistry } from '@imagiro/stream-registry';

import { ImagiroWorker } from './worker';

async function start(): Promise<void> {
  const db = initDb();
  const streamRegistry = new StreamRegistry();
  const worker = new ImagiroWorker(db, streamRegistry);
  void worker.start();
}

void start();
