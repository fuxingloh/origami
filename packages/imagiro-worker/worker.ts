import type { Db, Subscription, SubscriptionJob } from '@imagiro/imagiro-data';
import type { StreamRegistry } from '@imagiro/stream-registry';
import debug0 from 'debug';

import { OrigamiRuntime } from './runtime';

const debug = debug0('imagiro:worker');

export class ImagiroWorker {
  private cursor = { subscriptionId: '' };
  private running: boolean = false;

  constructor(
    private readonly db: Db,
    private readonly streamRegistry: StreamRegistry,
  ) {}

  async start(): Promise<void> {
    this.running = true;

    // eslint-disable-next-line no-async-promise-executor
    new Promise(async () => {
      while (this.running) {
        const job = await this.acquireSubscriptionJob();
        if (job === undefined) {
          continue;
        }

        try {
          await this.run(job);
          await this.releaseSubscriptionJob(job, 'completed');
        } catch (e) {
          debug('Error running job: %o', e);
          await this.releaseSubscriptionJob(job, 'errored');
        }
      }
    });
  }

  private async run(job: SubscriptionJob): Promise<void> {
    const subscription: Subscription = await this.db
      .selectFrom('Subscription')
      .where('subscriptionId', '=', job.subscriptionId)
      .selectAll()
      .executeTakeFirstOrThrow();

    const stream = this.streamRegistry.getReader(subscription.usi);
    if (stream === undefined) {
      debug(`No stream found for: %s, Job: %s`, subscription.usi, job.jobId);
      return;
    }

    const runtime = new OrigamiRuntime(subscription, stream, this.db);
    try {
      debug(`Subscription Starting: %s, Id: %s, Job: %s`, subscription.usi, subscription.subscriptionId, job.jobId);
      await runtime.start();
      debug('Subscription Executing: %s, Id: %s, Job: %s', subscription.usi, subscription.subscriptionId, job.jobId);
      await runtime.execute();
    } catch (e) {
      debug('Subscription Exception: %s, Id: %s, Job: %s', subscription.usi, subscription.subscriptionId, job.jobId);
      debug(e);
      throw e;
    } finally {
      debug('Subscription Disposing: %s, Id: %s, Job: %s', subscription.usi, subscription.subscriptionId, job.jobId);
      await runtime.dispose();
    }
  }

  private async acquireSubscriptionJob(): Promise<SubscriptionJob | undefined> {
    // TODO(?): Not to be optimized yet, as this is a prototype
    //  This is rather a complex and evolving query that changes as the shape how subscription worker get prioritized
    //  Many flaws, and might require a coordinator to manage subscription prioritization.
    //  Current flaw includes but not limited to:
    //  - It acquire new subscription Job even if there are no program are attached to it.
    //  - Does not have any prioritization mechanism.
    return await this.db.transaction().execute(async (trx) => {
      const subscription = await trx
        .selectFrom('Subscription')
        .select(['subscriptionId'])
        .where('subscriptionId', '>', this.cursor.subscriptionId)
        .forUpdate('Subscription')
        .skipLocked()
        .limit(1)
        .orderBy('subscriptionId', 'asc')
        .executeTakeFirst();

      // No available subscriptions
      if (subscription === undefined) {
        debug('No subscription available, resetting cursor and sleeping for 3 seconds');
        await new Promise((resolve) => setTimeout(resolve, 3000));
        this.cursor.subscriptionId = '';
        return undefined;
      }

      this.cursor.subscriptionId = subscription.subscriptionId;
      const recentJob = await trx
        .selectFrom('SubscriptionJob')
        .select(['updatedAt', 'status', 'jobId'])
        .where('subscriptionId', '=', subscription.subscriptionId)
        .limit(1)
        .orderBy('updatedAt', 'desc')
        .executeTakeFirst();

      if (recentJob !== undefined) {
        // Most recent Job is currently running, and last updated is less than 1 hour ago
        if (recentJob.status === 'running' && recentJob.updatedAt > new Date(Date.now() - 60 * 60 * 1000)) {
          debug('Job is running for more than 1 hour, releasing job: %s', recentJob.jobId);
          await this.db
            .updateTable('SubscriptionJob')
            .set({
              status: 'unknown',
              updatedAt: new Date(),
            })
            .where('jobId', '=', recentJob.jobId)
            .execute();
          return undefined;
        }

        // Most recent Job is completed but less than 3 seconds ago
        if (recentJob.status === 'completed' && recentJob.updatedAt > new Date(Date.now() - 3_000)) {
          return undefined;
        }

        // Most recent Job is completed but less than 1 minute ago
        if (recentJob.status === 'errored' && recentJob.updatedAt > new Date(Date.now() - 60_000)) {
          return undefined;
        }
      }

      return await trx
        .insertInto('SubscriptionJob')
        .values({
          subscriptionId: subscription.subscriptionId,
          status: 'running',
        })
        .returningAll()
        .executeTakeFirst();
    });
  }

  private async releaseSubscriptionJob(job: SubscriptionJob, status: 'completed' | 'errored'): Promise<void> {
    debug('Releasing job: %s', job.jobId);
    await this.db
      .updateTable('SubscriptionJob')
      .set({
        status: status,
        updatedAt: new Date(),
        stoppedAt: new Date(),
      })
      .where('jobId', '=', job.jobId)
      .execute();
  }

  async stop(): Promise<void> {
    this.running = false;
  }
}
