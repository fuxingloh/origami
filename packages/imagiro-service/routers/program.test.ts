import { Db, initDb } from '@imagiro/imagiro-data';
import { ImagiroMigrationProvider, Migrator } from '@imagiro/imagiro-data/migrations';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import { createCaller } from './_app';

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

  const migration = await new Migrator({ db, provider: new ImagiroMigrationProvider() }).migrateToLatest();
  expect(migration.error).toBeUndefined();
});

afterAll(async () => {
  await db.destroy();
  await postgres.stop();
});

const program = {
  version: 'v1' as const,
  code: 'function h(h){return{hash:h.hash}}export{h as map};',
  subscribe: [
    {
      from: 0,
      usi: 'eip155:31337/block',
    },
  ],
};

describe('Program.Create', () => {
  const owner1 = createCaller({ getDb: () => db, req: { authorization: 'Owner Create' } });

  it('should create a Program', async () => {
    expect(await owner1.Program.Create(program)).toHaveProperty('programId');
  });
});

describe('Program.List', () => {
  const owner0 = createCaller({ getDb: () => db, req: { authorization: 'Owner List.0' } });
  const owner1 = createCaller({ getDb: () => db, req: { authorization: 'Owner List.1' } });
  const owner2 = createCaller({ getDb: () => db, req: { authorization: 'Owner List.2' } });

  beforeAll(async () => {
    expect(await owner1.Program.Create(program)).toHaveProperty('programId');

    for (let i = 0; i < 100; i++) {
      expect(await owner2.Program.Create(program)).toHaveProperty('programId');
    }
  });

  it('should list 0 programs when owner=0', async () => {
    const result = await owner0.Program.List({});
    expect(result).toEqual({
      cursors: {
        after: undefined,
        before: undefined,
      },
      data: [],
    });
  });

  it('should list 1 programs when owner=1', async () => {
    const result = await owner1.Program.List({});
    expect(result).toEqual({
      cursors: {
        after: expect.any(String),
        before: expect.any(String),
      },
      data: [
        {
          programId: expect.any(String),
          version: 'v1',
          status: 'published',
          createdAt: expect.any(Date),
        },
      ],
    });
  });

  it('should list 100 programs when owner=2', async () => {
    const result = await owner2.Program.List({
      limit: 100,
    });
    expect(result).toEqual({
      cursors: {
        after: expect.any(String),
        before: expect.any(String),
      },
      data: expect.any(Array),
    });
    expect(result.data).toHaveLength(100);
  });

  describe('owner=2 pagination', () => {
    it('should get page 1,2,3 with limit 30', async () => {
      const page1 = await owner2.Program.List({
        page: 1,
        limit: 30,
      });
      expect(page1.data).toHaveLength(30);
      const page2 = await owner2.Program.List({
        page: 2,
        limit: 30,
      });
      expect(page2.data).toHaveLength(30);
      const page3 = await owner2.Program.List({
        page: 3,
        limit: 30,
      });
      expect(page3.data).toHaveLength(30);
      const page4 = await owner2.Program.List({
        page: 4,
        limit: 30,
      });
      expect(page4.data).toHaveLength(10);

      const ids = new Set<string>();
      page1.data.forEach((p) => ids.add(p.programId));
      page2.data.forEach((p) => ids.add(p.programId));
      page3.data.forEach((p) => ids.add(p.programId));
      page4.data.forEach((p) => ids.add(p.programId));
      expect(ids.size).toBe(100);
    });

    it('should fail to query if trying to get more than 1000 items', async () => {
      await expect(
        owner2.Program.List({
          page: 20,
          limit: 100,
        }),
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        name: 'TRPCError',
        cause: {
          issues: [
            {
              code: 'custom',
              message: 'a cursor is required for pagination after the first 1000',
              path: [],
            },
          ],
        },
      });
    });

    it('should use a mixture of page and cursor', async () => {
      const page1 = await owner2.Program.List({
        page: 1,
        limit: 30,
      });
      expect(page1.data).toHaveLength(30);

      const cursor2 = await owner2.Program.List({
        after: page1.cursors.after,
        limit: 40,
      });
      expect(cursor2.data).toHaveLength(40);

      const cursor3 = await owner2.Program.List({
        after: cursor2.cursors.after,
        limit: 40,
      });
      expect(cursor3.data).toHaveLength(30);

      const ids = new Set<string>();
      page1.data.forEach((p) => ids.add(p.programId));
      cursor2.data.forEach((p) => ids.add(p.programId));
      cursor3.data.forEach((p) => ids.add(p.programId));
      expect(ids.size).toBe(100);
    });
  });
});

describe('Program.Get', () => {
  const owner1 = createCaller({ getDb: () => db, req: { authorization: 'Owner Get' } });

  it('should get a Program with subscriptions', async () => {
    const program = await owner1.Program.Create({
      version: 'v1' as const,
      code: 'function h(h){return{hash:h.hash}}export{h as map};',
      subscribe: [
        { usi: 'eip155:31337/block' },
        { usi: 'eip155:31337/tx' },
        { usi: 'eip155:31337/tx', from: 10, to: 20 },
        { usi: 'eip155:31337/log', abi: 'erc20' },
      ],
    });
    expect(program).toHaveProperty('programId');

    const result = await owner1.Program.Get({ programId: program.programId });
    expect(result).toEqual({
      programId: program.programId,
      version: 'v1',
      status: 'published',
      subscribe: [
        { usi: 'eip155:31337/block', from: 0 },
        { usi: 'eip155:31337/tx', from: 0 },
        { usi: 'eip155:31337/tx', from: 10, to: 20 },
        { usi: 'eip155:31337/log', from: 0, abi: 'erc20' },
      ],
      code: 'function h(h){return{hash:h.hash}}export{h as map};',
      createdAt: expect.any(Date),
    });
  });
});

describe('Program.Start, Program.Stop', () => {
  const owner1 = createCaller({ getDb: () => db, req: { authorization: 'Owner Start' } });
  let programId: string;

  beforeEach(async () => {
    const created = await owner1.Program.Create(program);
    expect(created).toHaveProperty('programId');
    programId = created.programId;
  });

  it('should start & stop a Program', async () => {
    const startResult = await owner1.Program.Start({ programId });
    expect(startResult).toEqual({
      programId,
      status: 'started',
    });

    let getProgram = await owner1.Program.Get({ programId });
    expect(getProgram.status).toBe('started');

    const stopResult = await owner1.Program.Stop({ programId });
    expect(stopResult).toEqual({
      programId,
      status: 'stopped',
    });

    getProgram = await owner1.Program.Get({ programId });
    expect(getProgram.status).toBe('stopped');
  });
});
