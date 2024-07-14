import OJSON from '@fuxingloh/origami-json';
import { SubscriptionStream } from '@imagiro/imagiro-data';
import { z } from 'zod';

import { authorizedProcedure, router } from '../trpc';

const cursorSchema = z
  .string()
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    const json = Buffer.from(value, 'base64url').toString();
    return OJSON.parse(json);
  })
  .pipe(
    z
      .object({
        sort: z.string(),
        hash: z.string(),
        n: z.number(),
      })
      .optional(),
  );

const streamSchema = z.object({
  data: z.record(z.string(), z.any()),
  sort: z.string(),
  hash: z.string(),
  n: z.number(),
});

export const streamRouter = router({
  Query: authorizedProcedure
    .meta({ openapi: { method: 'POST', path: '/queryStream', tags: ['rpc'] } })
    .input(
      z.object({
        programId: z.string().uuid(),
        group: z.string().min(1).max(256).optional(),
        limit: z.number().min(1).max(100).default(20),
        reverse: z.boolean().default(true),
        after: z.string().optional().transform(cursorSchema.parse),
        before: z.string().optional().transform(cursorSchema.parse),
      }),
    )
    .output(
      z.object({
        data: z.array(streamSchema),
        cursors: z.object({
          before: z.string().optional(),
          after: z.string().optional(),
        }),
      }),
    )
    .query(async ({ input, ctx: { getDb, req } }) => {
      const reverse = input.reverse;
      let query = getDb()
        .selectFrom('SubscriptionStream')
        .where(({ eb, selectFrom }) => {
          return eb(
            'subscriptionId',
            'in',
            selectFrom('ProgramSubscription')
              .innerJoin('Program', 'Program.programId', 'ProgramSubscription.programId')
              .where('Program.programId', '=', input.programId)
              .where('Program.owner', '=', req.owner)
              .select('ProgramSubscription.subscriptionId'),
          );
        })
        .where(({ eb }) => {
          if (input.group !== undefined) {
            return eb('sort', 'is not', null).and('group', '=', input.group);
          }
          return eb('sort', 'is not', null);
        })
        .orderBy('sort', reverse ? 'desc' : 'asc')
        .orderBy('hash', reverse ? 'desc' : 'asc')
        .orderBy('n', reverse ? 'desc' : 'asc')
        .limit(input.limit);

      function expression(
        op: '>' | '<',
        cursor: NonNullable<z.output<typeof cursorSchema>>,
      ): Parameters<(typeof query)['where']>[0] {
        return (eb) =>
          eb.or([
            eb('sort', op, cursor.sort),
            eb('sort', '=', cursor.sort).and('hash', op, cursor.hash),
            eb('sort', '=', cursor.sort).and('hash', '=', cursor.hash).and('n', op, cursor.n),
          ]);
      }

      if (input.after) {
        query = query.where(expression(reverse ? '<' : '>', input.after));
      }
      if (input.before) {
        query = query.where(expression(reverse ? '>' : '<', input.before));
      }

      const result = await query.select(['sort', 'hash', 'n', 'data']).execute();
      return {
        data: result.map((item) => {
          return {
            data: item.data!,
            sort: item.sort!,
            hash: item.hash,
            n: item.n,
          };
        }),
        cursors: {
          before: result.length > 0 ? stringifyCursor(result[0]) : undefined,
          after: result.length > 0 ? stringifyCursor(result[result.length - 1]) : undefined,
        },
      };
    }),
});

function stringifyCursor(stream: Pick<SubscriptionStream, 'sort' | 'hash' | 'n'>): string {
  const json = OJSON.stringify({
    sort: stream.sort,
    hash: stream.hash,
    n: stream.n,
  });
  return Buffer.from(json).toString('base64url');
}
