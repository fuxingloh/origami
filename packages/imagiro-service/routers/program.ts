import { createHash } from 'node:crypto';

import { subscribeSchema } from '@fuxingloh/origami-program/types';
import { jsonArrayFrom, NewSubscription, type Program } from '@imagiro/imagiro-data';
import { TRPCError } from '@trpc/server';
import { parse } from 'acorn';
import stringify from 'fast-json-stable-stringify';
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
    return JSON.parse(json);
  })
  .pipe(
    z
      .object({
        programId: z.string(),
      })
      .optional(),
  );

export const programRouter = router({
  List: authorizedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(20),
          page: z.number().min(1).optional(),
          after: z.string().optional().transform(cursorSchema.parse),
          before: z.string().optional().transform(cursorSchema.parse),
        })
        .transform((input, ctx) => {
          if (input.page !== undefined && (input.after || input.before)) {
            ctx.addIssue({
              code: 'custom',
              message: 'a cursor cannot be used in conjunction with page',
            });
          }

          const offset = ((input.page ?? 1) - 1) * input.limit;
          if (offset > 1000) {
            ctx.addIssue({
              code: 'custom',
              message: 'a cursor is required for pagination after the first 1000',
            });
          }

          return {
            limit: input.limit,
            offset: offset,
            after: input.after,
            before: input.before,
          };
        }),
    )
    .output(
      z.object({
        data: z.array(
          z.object({
            programId: z.string(),
            version: z.literal('v1'),
            status: z.enum(['published', 'started', 'stopped', 'destroying']),
            createdAt: z.date(),
          }),
        ),
        cursors: z.object({
          before: z.string().optional(),
          after: z.string().optional(),
        }),
      }),
    )
    .query(async ({ input, ctx: { getDb, req } }) => {
      let query = getDb()
        .selectFrom('Program')
        .select(['programId', 'version', 'status', 'createdAt'])
        .where('owner', '=', req.owner)
        .orderBy('programId', 'desc')
        .limit(input.limit)
        .offset(input.offset);

      if (input.after) {
        query = query.where('programId', '<', input.after.programId);
      }

      if (input.before) {
        query = query.where('programId', '>', input.before.programId);
      }

      const result = await query.selectAll().execute();
      const firstCursor = result.length > 0 ? stringifyCursor(result[0]) : undefined;
      const lastCursor = result.length > 0 ? stringifyCursor(result[result.length - 1]) : undefined;

      return {
        data: result.map((program) => {
          return {
            programId: program.programId,
            version: program.version,
            status: program.status,
            createdAt: program.createdAt,
          };
        }),
        cursors: {
          before: firstCursor,
          after: lastCursor,
        },
      };
    }),
  Get: authorizedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/getProgram',
        tags: ['rpc'],
      },
    })
    .input(
      z.object({
        programId: z.string().uuid(),
      }),
    )
    .output(
      z.object({
        programId: z.string(),
        version: z.literal('v1'),
        subscribe: z.array(z.object({ usi: z.string() }).and(z.record(z.string(), z.unknown()))),
        code: z.string(),
        status: z.enum(['published', 'started', 'stopped', 'destroying']),
        createdAt: z.date(),
      }),
    )
    .query(async ({ input, ctx: { getDb, req } }) => {
      const program = await getDb()
        .selectFrom('Program')
        .select((eb) => [
          'Program.programId',
          'Program.version',
          'Program.code',
          'Program.status',
          'Program.createdAt',
          jsonArrayFrom(
            eb
              .selectFrom('ProgramSubscription')
              .innerJoin('Subscription', 'ProgramSubscription.subscriptionId', 'Subscription.subscriptionId')
              .select(['Subscription.usi', 'Subscription.config'])
              .whereRef('ProgramSubscription.programId', '=', 'Program.programId'),
          ).as('subscribe'),
        ])
        .leftJoin('ProgramSubscription', 'Program.programId', 'ProgramSubscription.programId')
        .where('Program.programId', '=', input.programId)
        .where('Program.owner', '=', req.owner)
        .selectAll()
        .executeTakeFirstOrThrow();

      return {
        programId: program.programId,
        version: program.version,
        subscribe: program.subscribe.map((sub) => ({
          ...sub.config,
          usi: sub.usi,
        })),
        code: program.code,
        status: program.status,
        createdAt: program.createdAt,
      };
    }),
  Create: authorizedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/createProgram',
        tags: ['rpc'],
      },
    })
    .input(
      z
        .object({
          version: z.literal('v1'),
          subscribe: subscribeSchema,
          code: z.string().max(100 * 1024, 'too long'),
        })
        .refine((program) => {
          try {
            parse(program.code, { ecmaVersion: 2022, sourceType: 'module' });
            return true;
          } catch (e) {
            return false;
          }
        }),
    )
    .output(
      z.object({
        programId: z.string(),
        status: z.literal('published'),
      }),
    )
    .mutation(async ({ input, ctx: { getDb, req } }) => {
      const programId = await getDb()
        .transaction()
        .execute(async (tx) => {
          const insertedProgram = await tx
            .insertInto('Program')
            .values({
              owner: req.owner,
              version: input.version,
              code: input.code,
              status: 'published',
            })
            .returning(['programId'])
            .executeTakeFirstOrThrow();

          // Insert into Subscription if they do not already exist
          const subscriptions = input.subscribe.map((sub): NewSubscription => {
            const sha256 = createHash('sha256')
              .update(
                stringify({
                  version: input.version,
                  config: sub,
                  code: input.code,
                }),
              )
              .digest('hex');

            return {
              subscriptionId: sha256,
              usi: sub.usi,
              version: input.version,
              code: input.code,
              config: sub,
            };
          });

          await tx
            .insertInto('Subscription')
            .values(subscriptions)
            .onConflict((b) => {
              return b.columns(['subscriptionId']).doNothing();
            })
            .execute();

          await tx
            .insertInto('ProgramSubscription')
            .values(
              subscriptions.map((sub) => ({
                programId: insertedProgram.programId,
                subscriptionId: sub.subscriptionId,
              })),
            )
            .execute();
          return insertedProgram.programId;
        })
        .catch(() => {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to publish program',
          });
        });

      return {
        programId: programId,
        status: 'published',
      };
    }),
  Start: authorizedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/startProgram',
        tags: ['rpc'],
      },
    })
    .input(
      z.object({
        programId: z.string().uuid(),
      }),
    )
    .output(
      z.object({
        programId: z.string(),
        status: z.literal('started'),
      }),
    )
    .mutation(async ({ input, ctx: { getDb, req } }) => {
      const program = await getDb()
        .selectFrom('Program')
        .where('programId', '=', input.programId)
        .where('owner', '=', req.owner)
        .select(['programId', 'status'])
        .executeTakeFirstOrThrow();

      if (program.status === 'started') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Program already started',
        });
      }

      await getDb()
        .updateTable('Program')
        .set({
          status: 'started',
        })
        .where('programId', '=', input.programId)
        .execute();

      return {
        programId: program.programId,
        status: 'started',
      };
    }),
  Stop: authorizedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/stopProgram',
        tags: ['rpc'],
      },
    })
    .input(
      z.object({
        programId: z.string().uuid(),
      }),
    )
    .output(
      z.object({
        programId: z.string(),
        status: z.literal('stopped'),
      }),
    )
    .mutation(async ({ input, ctx: { getDb, req } }) => {
      const program = await getDb()
        .selectFrom('Program')
        .where('programId', '=', input.programId)
        .where('owner', '=', req.owner)
        .select(['programId', 'status'])
        .executeTakeFirstOrThrow();

      if (program.status === 'stopped') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Program already stopped',
        });
      }

      await getDb()
        .updateTable('Program')
        .set({
          status: 'stopped',
        })
        .where('programId', '=', input.programId)
        .execute();

      return {
        programId: program.programId,
        status: 'stopped',
      };
    }),
});

function stringifyCursor(program: Pick<Program, 'programId'>): string {
  const json = JSON.stringify({
    programId: program.programId,
  });
  return Buffer.from(json).toString('base64url');
}
