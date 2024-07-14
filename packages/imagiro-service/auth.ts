import { experimental_standaloneMiddleware, TRPCError } from '@trpc/server';
import { z } from 'zod';

interface TCtx {
  ctx: {
    req: { authorization: string | undefined };
  };
}

const config = z
  .object({
    SERVICE_IAM_MODE: z.enum(['Federated', 'None']).default('None'),
    SERVICE_IAM_ENDPOINT: z.string().url('Invalid URL').optional(),
  })
  .refine(
    (data) => {
      if (data.SERVICE_IAM_MODE === 'Federated') {
        return data.SERVICE_IAM_ENDPOINT !== undefined;
      }
      return true;
    },
    {
      message: 'SERVICE_IAM_ENDPOINT is required when SERVICE_IAM_MODE is Bearer',
    },
  )
  .parse({
    SERVICE_IAM_MODE: process.env.SERVICE_IAM_MODE,
    SERVICE_IAM_ENDPOINT: process.env.SERVICE_IAM_ENDPOINT || undefined,
  });

export function createAuthorizationMiddleware() {
  if (config.SERVICE_IAM_MODE === 'Federated') {
    return createFederatedMiddleware();
  }

  return createNoneMiddleware();
}

/**
 * Authorization: Bearer <token> -> Owner: 'resolved.owner'
 * Contact IAM service to authorize the request and resolve the owner.
 */
function createFederatedMiddleware() {
  return experimental_standaloneMiddleware<TCtx>().create(async (opts) => {
    const [type, token] = parseAuthorizationHeader(opts.ctx.req.authorization);
    if (type !== 'Bearer') {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    const [namespace, method] = opts.path.split('.');
    const response = await getAuthorization({
      token: token,
      namespace,
      method,
      input: opts.rawInput,
    });

    if (!response.authorized) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    return opts.next({
      ctx: {
        req: {
          owner: response.owner,
        },
      },
    });
  });
}

function createNoneMiddleware() {
  return experimental_standaloneMiddleware<TCtx>().create(async (opts) => {
    if (opts.ctx.req.authorization === undefined) {
      return opts.next({
        ctx: {
          req: {
            owner: '0',
          },
        },
      });
    }

    const [type, owner] = parseAuthorizationHeader(opts.ctx.req.authorization);
    if (type !== 'Owner') {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    return opts.next({
      ctx: {
        req: {
          owner: owner,
        },
      },
    });
  });
}

function parseAuthorizationHeader(authorization: string | undefined): [string, string] {
  if (authorization === undefined) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  const [type, token] = authorization.split(' ');
  if (type === undefined || token === undefined) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return [type, token];
}

async function getAuthorization(request: IAMRequest): Promise<IAMResponse> {
  if (request.token === '') {
    return {
      authorized: false,
      owner: undefined,
    };
  }

  return {
    authorized: true,
    owner: '0',
  };
}

export interface IAMRequest {
  token: string;
  namespace: string;
  method: string;
  input: unknown;
}

export type IAMResponse =
  | {
      authorized: true;
      owner: string;
    }
  | {
      authorized: false;
      owner: string | undefined;
    };
