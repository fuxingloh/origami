import debug0 from 'debug';

import { initDb } from './database';
import { ImagiroMigrationProvider, Migrator } from './migrations';

const debug = debug0('imagiro:data:cli');

async function migrate(): Promise<void> {
  const db = initDb();
  const migrator = new Migrator({ db, provider: new ImagiroMigrationProvider() });
  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === 'Success') {
      debug(`Migration %s was executed successfully`, it.migrationName);
    } else if (it.status === 'Error') {
      debug(`Failed to execute migration %s`, it.migrationName);
    }
  });

  if (error) {
    debug('Failed to migrate');
    console.error(error);
    process.exitCode = 1;
  }
}

const command = process.argv[2];
debug('Running command: %s', command);
switch (command) {
  case 'migrate':
    void migrate();
    break;
  default:
    debug('Unknown command: %s', command);
    process.exitCode = 1;
}
