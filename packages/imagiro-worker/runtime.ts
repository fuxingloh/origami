import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { rm, writeFile } from 'node:fs/promises';

import OJSON from '@fuxingloh/origami-json';
import { Event, streamSchema } from '@fuxingloh/origami-program/types';
import type { Db, NewSubscriptionStream, Subscription } from '@imagiro/imagiro-data';
import type { CheckpointSignal, EventSignal } from '@imagiro/stream-core';
import { AnyStream } from '@imagiro/stream-registry';
import debug0 from 'debug';
import stringify from 'fast-json-stable-stringify';
import got from 'got';

const debug = debug0('imagiro:program:runtime');

export class OrigamiRuntime<Header = any, Data = any> {
  constructor(
    private readonly subscription: Subscription,
    private readonly stream: AnyStream,
    private readonly db: Db,
    private readonly deno = new DenoProcess(subscription),
  ) {}

  public async start(): Promise<void> {
    await this.deno.start();
  }

  public async dispose(): Promise<void> {
    await this.deno.dispose();
  }

  public async execute(): Promise<void> {
    let checkpoint: CheckpointSignal<Header> | undefined = await this.getCheckpoint();
    let count = 0;
    while (count++ < 1000) {
      if (checkpoint === undefined) {
        debug('execute loop no checkpoint: exiting');
        break;
      }

      const signal = await this.stream.getNext(this.subscription.config, checkpoint.header);

      if (signal.type === 'event') {
        const items: NewSubscriptionStream[] = await this.event(signal);
        debug('NextSignal: event: items mapped: %d', items.length);
        if (items.length > 0) {
          await this.db.insertInto('SubscriptionStream').values(items).execute();
        }
        checkpoint = signal;
        continue;
      }

      if (signal.type === 'header') {
        debug('NextSignal: header: %o', signal.header);
        checkpoint = signal;
        continue;
      }

      if (signal.type === 'fork') {
        debug('NextSignal: fork: %o', signal);
        await this.db
          .deleteFrom('SubscriptionStream')
          .where((eb) =>
            eb.and({
              subscriptionId: this.subscription.subscriptionId,
              hash: createHeaderHash(this.stream.usi, signal.header),
            }),
          )
          .execute();
        checkpoint = await this.getCheckpoint();
        continue;
      }

      if (signal.type === 'sleep') {
        debug('NextSignal: sleep.');
        break;
      }

      if (signal.type === 'error') {
        debug('NextSignal: error. %o', signal.error);
        break;
      }

      debug('NextSignal: unknown received: %o', signal);
      throw new Error('NextSignal: unknown');
    }

    if (checkpoint !== undefined) {
      await this.saveCheckpoint(checkpoint);
    }
  }

  private async event(signal: EventSignal<Header, Data>): Promise<NewSubscriptionStream[]> {
    const event: Event = {
      usi: this.stream.usi,
      hash: createHeaderHash(this.stream.usi, signal.header),
      sequence: signal.sequence,
      timestamp: signal.timestamp,
    };

    debug('Event: %o', event);
    const items = await this.deno.call({ data: signal.data, event });

    if (items.length > 10_000) {
      throw new Error('Too many items returned');
    }

    return items.map((object: any, n: number) => {
      const data = streamSchema.parse(object);

      return {
        subscriptionId: this.subscription.subscriptionId,
        hash: event.hash,
        n: n,
        sort: createSort(object, event),
        group: createGroup(object),
        sequence: event.sequence,
        header: OJSON.pack(signal.header),
        data: OJSON.pack(data),
      };
    });
  }

  private async getCheckpoint(): Promise<CheckpointSignal<Header> | undefined> {
    const result = await this.db
      .selectFrom('SubscriptionStream')
      .where('subscriptionId', '=', this.subscription.subscriptionId)
      .orderBy('sequence', 'desc')
      .select(['header', 'sequence'])
      .limit(1)
      .executeTakeFirst();

    if (result !== undefined) {
      return {
        sequence: result.sequence,
        header: OJSON.unpack(result.header),
      };
    }

    const signal = await this.stream.getFirst(this.subscription.config);
    if (signal.type === 'header') {
      return signal;
    }

    if (signal.type === 'error') {
      debug('FirstSignal: error. %o', signal.error);
      return undefined;
    }

    if (signal.type === 'sleep') {
      debug('FirstSignal: sleep.');
      return undefined;
    }

    debug('FirstSignal: unknown received: %o', signal);
    throw new Error('FirstSignal: unknown');
  }

  private async saveCheckpoint(signal: CheckpointSignal<Header>): Promise<void> {
    await this.db
      .insertInto('SubscriptionStream')
      .values({
        subscriptionId: this.subscription.subscriptionId,
        hash: createHeaderHash(this.stream.usi, signal.header),
        n: 0,
        sequence: signal.sequence,
        header: OJSON.pack(signal.header),
      })
      .onConflict((b) => {
        return b.columns(['subscriptionId', 'hash', 'n']).doNothing();
      })
      .execute();
  }
}

class DenoProcess {
  private readonly pid: string = randomBytes(8).toString('hex');
  private readonly socketPath: string = `./program/${this.pid}.sock`;
  private readonly targetFile: string = `./program/${this.pid}.js`;
  private child?: ChildProcessWithoutNullStreams;

  constructor(private readonly subscription: Subscription) {}

  async start() {
    await writeFile(this.targetFile, this.subscription.code);

    this.child = spawn('deno', ['run', `--allow-read=${this.socketPath}`, `--allow-write=${this.socketPath}`, '-'], {
      stdio: 'pipe',
    });

    // language=JavaScript
    const stdin = `
      import OJSON from '../origami-json/index.ts';
      import { map } from '${this.targetFile}';

      Deno.serve({ path: '${this.socketPath}' }, async (req) => {
        if (req.method === 'GET') return new Response('OK');

        const { data, event } = OJSON.parse(await req.text());
        let output = await map(data, event);
        if (output === undefined || output === null) {
          output = [];
        } else if (!Array.isArray(output)) {
          output = [output];
        }
        return new Response(OJSON.stringify(output));
      });
    `;
    this.child.stdout.pipe(process.stdout);
    this.child.stderr.pipe(process.stderr);
    this.child.stdin.end(stdin);
    await this.waitForHealthy();
  }

  /**
   * Attempt to dispose of the program, cleaning up any resources.
   */
  async dispose() {
    this.child?.kill('SIGKILL');
    try {
      await rm(this.socketPath, { force: true });
    } catch (e) {
      // ignore if file does not exist
    }
    try {
      await rm(this.targetFile, { force: true });
    } catch (e) {
      // ignore if file does not exist
    }
  }

  async call(body: { data: any; event: Event }): Promise<any[]> {
    const response = await got('http://program', {
      method: 'POST',
      socketPath: this.socketPath,
      body: OJSON.stringify(body),
    });
    return OJSON.parse(response.body);
  }

  private async waitForHealthy() {
    for (let i = 0; i < 50; i++) {
      try {
        const response = await got('http://program', { method: 'GET', socketPath: this.socketPath });
        if (response.body === 'OK') return;
      } catch (e) {
        // ignore
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    debug('Failed to start program');
    throw new Error('Failed to start program');
  }
}

/**
 * Create a unique event id based on the usi and the header of the signal.
 * This signal hash is unique across all streams.
 */
function createHeaderHash<Header>(usi: string, header: Header): string {
  const json = stringify({ usi: usi, header: OJSON.pack(header) });
  return createHash('sha256').update(json).digest('hex');
}

function createSort(mapped: any, event: Event): string {
  if (typeof mapped === 'object' && typeof mapped['$sort'] === 'string') {
    return mapped['$sort'];
  }
  const sort = BigInt(event.timestamp) * 1_000_000_000n + (event.sequence % 1_000_000_000n);
  return sort.toString(36).padStart(16, '0');
}

function createGroup(mapped: any): string | null {
  if (typeof mapped !== 'object') {
    return null;
  }

  if (typeof mapped['$group'] !== 'string') {
    return null;
  }

  return mapped['$group'];
}
