import {
  Kysely,
  // Alias to "raw" to prevent IntelliJ from formatting the sql string
  sql as raw,
} from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('Program')
    .addColumn('owner', 'text', (col) => col.notNull())
    .addColumn('programId', 'uuid', (col) => col.primaryKey().defaultTo(raw`gen_random_uuid()`))
    .addColumn('version', 'text', (col) => col.notNull())
    .addColumn('status', 'text', (col) => col.notNull())
    .addColumn('code', 'text', (col) => col.notNull())
    .addColumn('createdAt', 'timestamp', (col) => col.defaultTo(raw`now()`).notNull())
    .execute();

  await db.schema.createIndex('IDX_Program_Owner').on('Program').columns(['owner', 'programId']).execute();

  await db.schema
    .createTable('Subscription')
    .addColumn('subscriptionId', 'text', (col) => col.primaryKey())
    .addColumn('usi', 'text', (col) => col.notNull())
    .addColumn('version', 'text', (col) => col.notNull())
    .addColumn('config', 'jsonb', (col) => col.notNull())
    .addColumn('code', 'text', (col) => col.notNull())
    .addColumn('createdAt', 'timestamp', (col) => col.defaultTo(raw`now()`).notNull())
    .execute();

  await db.schema
    .createTable('ProgramSubscription')
    .addColumn('programSubscriptionId', 'uuid', (col) => col.primaryKey().defaultTo(raw`gen_random_uuid()`))
    .addColumn('programId', 'uuid', (col) => col.notNull())
    .addColumn('subscriptionId', 'text', (col) => col.notNull())
    .addForeignKeyConstraint('FK_ProgramSubscription_Program', ['programId'], 'Program', ['programId'])
    .addForeignKeyConstraint('FK_ProgramSubscription_Subscription', ['subscriptionId'], 'Subscription', [
      'subscriptionId',
    ])
    .execute();

  await db.schema
    .createTable('SubscriptionStream')
    .addColumn('subscriptionId', 'text', (col) => col.notNull())
    .addColumn('hash', 'text', (col) => col.notNull())
    .addColumn('n', 'int4', (col) => col.notNull())
    .addColumn('group', 'text', (col) => col)
    .addColumn('sort', 'text', (col) => col)
    .addColumn('sequence', 'numeric', (col) => col.notNull())
    .addColumn('header', 'jsonb', (col) => col.notNull())
    .addColumn('data', 'jsonb', (col) => col)
    .addPrimaryKeyConstraint('PK_SubscriptionStream', ['subscriptionId', 'hash', 'n'])
    .addForeignKeyConstraint('FK_SubscriptionStream_Subscription', ['subscriptionId'], 'Subscription', [
      'subscriptionId',
    ])
    .addUniqueConstraint('UQ_CURSOR_SubscriptionStream_Sort', ['subscriptionId', 'sort', 'hash', 'n'])
    .addUniqueConstraint('UQ_CURSOR_SubscriptionStream_Group', ['subscriptionId', 'group', 'sort', 'hash', 'n'])
    .execute();

  await db.schema
    .createIndex('IDX_SubscriptionStream_Checkpoint')
    .on('SubscriptionStream')
    .columns(['subscriptionId', 'sequence'])
    .execute();

  await db.schema
    .createTable('SubscriptionJob')
    .addColumn('jobId', 'uuid', (col) => col.primaryKey().defaultTo(raw`gen_random_uuid()`))
    .addColumn('subscriptionId', 'text', (col) => col.notNull())
    .addColumn('status', 'text', (col) => col.notNull())
    .addColumn('updatedAt', 'timestamp', (col) => col.notNull().defaultTo(raw`now()`))
    .addColumn('startedAt', 'timestamp', (col) => col.notNull().defaultTo(raw`now()`))
    .addColumn('stoppedAt', 'timestamp', (col) => col)
    .addForeignKeyConstraint('FK_SubscriptionJob_Subscription', ['subscriptionId'], 'Subscription', ['subscriptionId'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('SubscriptionJob').execute();
  await db.schema.dropTable('SubscriptionStream').execute();
  await db.schema.dropTable('ProgramSubscription').execute();
  await db.schema.dropTable('Subscription').execute();
  await db.schema.dropTable('Program').execute();
}
