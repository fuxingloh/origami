import { afterAll, beforeAll, expect, it } from '@jest/globals';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import { Db, initDb } from './database';
import { ImagiroMigrationProvider, Migrator } from './migrations';

let postgres: StartedPostgreSqlContainer;
let db: Db;

beforeAll(async () => {
  postgres = await new PostgreSqlContainer().withDatabase('imagiro-data').start();
  db = initDb({
    database: postgres.getDatabase(),
    host: postgres.getHost(),
    port: postgres.getMappedPort(5432),
    user: postgres.getUsername(),
    password: postgres.getPassword(),
  });

  const migrator = new Migrator({ db, provider: new ImagiroMigrationProvider() });
  const migration = await migrator.migrateToLatest();
  expect(migration.error).toBeUndefined();
});

afterAll(async () => {
  await db.destroy();
  await postgres.stop();
});

it('should create, update, select and delete a Program', async () => {
  const { programId } = await db
    .insertInto('Program')
    .values({
      owner: '0',
      version: 'v1',
      code: 'export function map(h){return{hash:h.hash}};',
      status: 'published',
    })
    .returning(['programId'])
    .executeTakeFirstOrThrow();

  const updateResult = await db
    .updateTable('Program')
    .set({ status: 'started' })
    .where('programId', '=', programId)
    .executeTakeFirst();

  expect(updateResult.numUpdatedRows).toStrictEqual(1n);

  const selected = await db.selectFrom('Program').where('programId', '=', programId).selectAll().executeTakeFirst();

  expect(selected).toStrictEqual({
    programId,
    version: 'v1',
    owner: '0',
    code: 'export function map(h){return{hash:h.hash}};',
    status: 'started',
    createdAt: expect.any(Date),
  });

  const deleteResult = await db.deleteFrom('Program').where('programId', '=', programId).executeTakeFirst();
  expect(deleteResult.numDeletedRows).toStrictEqual(1n);

  const selectAll = await db.selectFrom('Program').where('programId', '=', programId).selectAll().execute();

  expect(selectAll).toStrictEqual([]);
});
