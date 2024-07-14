import { CFTestcontainers } from '@chainfile/testcontainers';
import { OrigamiClient, query, unpack } from '@fuxingloh/origami/client';
import { ImagiroTestcontainers, StartedImagiroTestcontainers } from '@imagiro/imagiro-testcontainers';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import BitcoindRegtest from 'chainfile-bitcoin/regtest.json';

let bitcoind: CFTestcontainers;
let imagiro: StartedImagiroTestcontainers;
let programId: string;

beforeAll(async () => {
  bitcoind = new CFTestcontainers(BitcoindRegtest);
  await bitcoind.start();
  imagiro = await new ImagiroTestcontainers()
    .withUSI('bip122:0f9188f13cb7b2c71f2a335e3a4fc328/block', {
      endpoint: bitcoind.get('bitcoind').getHostEndpoint('rpc', 'host.docker.internal'),
      headers: bitcoind.get('bitcoind').getAuthHeaders('rpc'),
    })
    .start();

  programId = (await imagiro.deploy(__dirname, 'cursor.origami.ts')).programId;
  await bitcoind.get('bitcoind').rpc({
    method: 'generatetoaddress',
    params: [10, 'bcrt1q4u4nsgk6ug0sqz7r3rj9tykjxrsl0yy4d0wwte'],
  });
  await imagiro.waitForStream(programId, 22);
});

afterAll(async () => {
  await Promise.all([bitcoind.stop(), imagiro.stop()]);
});

describe('[b10, t10, b9, t9, b8, t8, b7, t7, b6, t6, b5, t5, b4, t4, b3, t3, b2, t2, b1, t1, b0, t0]', () => {
  it('should have 22 data', async () => {
    const result = await imagiro.client.rpc.streamQuery({ programId: programId, limit: 100 });
    expect(result.data.length).toStrictEqual(22);
  });

  describe('using OrigamiClient', () => {
    let client: OrigamiClient;
    beforeAll(async () => {
      client = imagiro.client;
    });

    it('should paginate', async () => {
      const b10_b9 = await client.rpc.streamQuery({
        programId: programId,
        limit: 3,
      });

      expect(unpack(b10_b9)).toMatchObject({
        data: [
          {
            n: 1,
            data: {
              type: 'block',
              height: 10n,
            },
          },
          {
            n: 0,
            data: {
              count: 1,
              type: 'tx',
              height: 10n,
            },
          },
          {
            n: 1,
            data: {
              type: 'block',
              height: 9n,
            },
          },
        ],
        cursors: {
          before: expect.any(String),
          after: expect.any(String),
        },
      });

      const t9_b7 = await client.rpc.streamQuery({
        programId: programId,
        limit: 4,
        after: b10_b9.cursors.after,
      });

      expect(unpack(t9_b7)).toMatchObject({
        data: [
          {
            n: 0,
            data: {
              count: 1,
              type: 'tx',
              height: 9n,
            },
          },
          {
            n: 1,
            data: {
              type: 'block',
              height: 8n,
            },
          },
          {
            n: 0,
            data: {
              count: 1,
              type: 'tx',
              height: 8n,
            },
          },
          {
            n: 1,
            data: {
              type: 'block',
              height: 7n,
            },
          },
        ],
        cursors: {
          before: expect.any(String),
          after: expect.any(String),
        },
      });

      const t7_t5 = await client.rpc.streamQuery({
        programId: programId,
        limit: 5,
        after: t9_b7.cursors.after,
      });

      expect(unpack(t7_t5)).toMatchObject({
        data: [
          {
            n: 0,
            data: {
              count: 1,
              type: 'tx',
              height: 7n,
            },
          },
          {
            n: 1,
            data: {
              type: 'block',
              height: 6n,
            },
          },
          {
            n: 0,
            data: {
              count: 1,
              type: 'tx',
              height: 6n,
            },
          },
          {
            n: 1,
            data: {
              type: 'block',
              height: 5n,
            },
          },
          {
            n: 0,
            data: {
              count: 1,
              type: 'tx',
              height: 5n,
            },
          },
        ],
        cursors: {
          before: expect.any(String),
          after: expect.any(String),
        },
      });

      const b7_t8 = await client.rpc.streamQuery({
        programId: programId,
        limit: 2,
        after: t7_t5.cursors.before,
        reverse: false,
      });

      expect(unpack(b7_t8)).toMatchObject({
        data: [
          {
            n: 1,
            data: {
              type: 'block',
              height: 7n,
            },
          },
          {
            n: 0,
            data: {
              count: 1,
              type: 'tx',
              height: 8n,
            },
          },
        ],
        cursors: {
          before: expect.any(String),
          after: expect.any(String),
        },
      });

      const b8_b9 = await client.rpc.streamQuery({
        programId: programId,
        limit: 3,
        after: b7_t8.cursors.after,
        reverse: false,
      });

      expect(unpack(b8_b9)).toMatchObject({
        data: [
          {
            n: 1,
            data: {
              type: 'block',
              height: 8n,
            },
          },
          {
            n: 0,
            data: {
              count: 1,
              type: 'tx',
              height: 9n,
            },
          },
          {
            n: 1,
            data: {
              type: 'block',
              height: 9n,
            },
          },
        ],
        cursors: {
          before: expect.any(String),
          after: expect.any(String),
        },
      });

      const t8_t5 = await client.rpc.streamQuery({
        programId: programId,
        limit: 7,
        after: b8_b9.cursors.before,
        reverse: true,
      });

      expect(unpack(t8_t5)).toMatchObject({
        data: [
          {
            n: 0,
            data: {
              count: 1,
              type: 'tx',
              height: 8n,
            },
          },
          {
            n: 1,
            data: {
              type: 'block',
              height: 7n,
            },
          },
          {
            n: 0,
            data: {
              count: 1,
              type: 'tx',
              height: 7n,
            },
          },
          {
            n: 1,
            data: {
              type: 'block',
              height: 6n,
            },
          },
          {
            n: 0,
            data: {
              count: 1,
              type: 'tx',
              height: 6n,
            },
          },
          {
            n: 1,
            data: {
              type: 'block',
              height: 5n,
            },
          },
          {
            n: 0,
            data: {
              count: 1,
              type: 'tx',
              height: 5n,
            },
          },
        ],
        cursors: {
          before: expect.any(String),
          after: expect.any(String),
        },
      });

      const b4_t10 = await client.rpc.streamQuery({
        programId: programId,
        limit: 20,
        after: t8_t5.cursors.after,
        reverse: true,
      });

      expect(unpack(b4_t10)).toMatchObject({
        data: [
          {
            n: 1,
            data: {
              type: 'block',
              height: 4n,
            },
          },
          {
            n: 0,
            data: {
              count: 1,
              type: 'tx',
              height: 4n,
            },
          },
          {
            n: 1,
            data: {
              type: 'block',
              height: 3n,
            },
          },
          {
            n: 0,
            data: {
              count: 1,
              type: 'tx',
              height: 3n,
            },
          },
          {
            n: 1,
            data: {
              type: 'block',
              height: 2n,
            },
          },
          {
            n: 0,
            data: {
              count: 1,
              type: 'tx',
              height: 2n,
            },
          },
          {
            n: 1,
            data: {
              type: 'block',
              height: 1n,
            },
          },
          {
            n: 0,
            data: {
              count: 1,
              type: 'tx',
              height: 1n,
            },
          },
          {
            n: 1,
            data: {
              type: 'block',
              height: 0n,
            },
          },
          {
            n: 0,
            data: {
              count: 1,
              type: 'tx',
              height: 0n,
            },
          },
        ],
        cursors: {
          before: expect.any(String),
          after: expect.any(String),
        },
      });
    });

    it('should start paginate in reverse=false', async () => {
      const t0_b0 = await client.rpc.streamQuery({
        programId: programId,
        limit: 2,
        reverse: false,
      });

      expect(unpack(t0_b0)).toMatchObject({
        data: [
          {
            n: 0,
            data: {
              count: 1,
              type: 'tx',
              height: 0n,
            },
          },
          {
            n: 1,
            data: {
              type: 'block',
              height: 0n,
            },
          },
        ],
        cursors: {
          before: expect.any(String),
          after: expect.any(String),
        },
      });

      const t1_t2 = await client.rpc.streamQuery({
        programId: programId,
        limit: 3,
        after: t0_b0.cursors.after,
        reverse: false,
      });

      expect(unpack(t1_t2)).toMatchObject({
        data: [
          {
            n: 0,
            data: {
              count: 1,
              type: 'tx',
              height: 1n,
            },
          },
          {
            n: 1,
            data: {
              type: 'block',
              height: 1n,
            },
          },
          {
            n: 0,
            data: {
              count: 1,
              type: 'tx',
              height: 2n,
            },
          },
        ],
        cursors: {
          before: expect.any(String),
          after: expect.any(String),
        },
      });

      const b0 = await client.rpc.streamQuery({
        programId: programId,
        limit: 1,
        after: t1_t2.cursors.before,
        reverse: true,
      });

      expect(unpack(b0)).toMatchObject({
        data: [
          {
            n: 1,
            data: {
              type: 'block',
              height: 0n,
            },
          },
        ],
        cursors: {
          before: expect.any(String),
          after: expect.any(String),
        },
      });

      const t1_b2 = await client.rpc.streamQuery({
        programId: programId,
        limit: 4,
        after: b0.cursors.before,
        reverse: false,
      });

      expect(unpack(t1_b2)).toMatchObject({
        data: [
          {
            n: 0,
            data: {
              count: 1,
              type: 'tx',
              height: 1n,
            },
          },
          {
            n: 1,
            data: {
              type: 'block',
              height: 1n,
            },
          },
          {
            n: 0,
            data: {
              count: 1,
              type: 'tx',
              height: 2n,
            },
          },
          {
            n: 1,
            data: {
              type: 'block',
              height: 2n,
            },
          },
        ],
        cursors: {
          before: expect.any(String),
          after: expect.any(String),
        },
      });
    });
  });

  describe('using @fuxingloh/origami/stream', () => {
    it('should paginate', async () => {
      const config = {
        endpoint: imagiro.getServiceEndpoint(),
        token: '',
      };
      const first2 = await query(config, {
        programId: programId,
        limit: 2,
      });

      expect(first2).toMatchObject({
        data: [
          {
            n: 1,
            data: {
              type: 'block',
              height: 10n,
            },
          },
          {
            n: 0,
            data: {
              count: 1,
              type: 'tx',
              height: 10n,
            },
          },
        ],
        cursors: {
          before: expect.any(String),
          after: expect.any(String),
        },
      });

      const next3 = await query(config, {
        programId: programId,
        limit: 3,
        after: first2.cursors.after,
      });

      expect(next3).toMatchObject({
        data: [
          {
            n: 1,
            data: {
              type: 'block',
              height: 9n,
            },
          },
          {
            n: 0,
            data: {
              count: 1,
              type: 'tx',
              height: 9n,
            },
          },
          {
            n: 1,
            data: {
              type: 'block',
              height: 8n,
            },
          },
        ],
        cursors: {
          before: expect.any(String),
          after: expect.any(String),
        },
      });

      const next2 = await query(config, {
        programId: programId,
        limit: 2,
        after: next3.cursors.after,
      });

      expect(next2).toMatchObject({
        data: [
          {
            n: 0,
            data: {
              count: 1,
              type: 'tx',
              height: 8n,
            },
          },
          {
            n: 1,
            data: {
              type: 'block',
              height: 7n,
            },
          },
        ],
        cursors: {
          before: expect.any(String),
          after: expect.any(String),
        },
      });
    });
  });
});
