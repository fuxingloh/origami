import { expect, it } from '@jest/globals';

import OJSON from './';

const data = {
  a: 1.5,
  b: 1n,
  array: [1n, 2n],
  object: { c: 1n },
  objects: [
    { d: 1n },
    {
      e: 2n,
      f: 'string',
      g: true,
      h: null,
      i: 99.95,
      j: 1n,
      k: [{}],
      l: {
        m: 1n,
        n: 'ss',
        o: true,
        p: [],
        q: {},
      },
    },
  ],
  aa: 'string',
  bb: 1.5,
  cc: true,
  dd: ['a', 1.5, true, [], {}, null, 5n],
  ee: { a: 1n, b: 'string', c: true, d: [], e: {}, f: null, g: 5.5 },
  ff: null,
  gg: 5n,
};

it('should stringify and parse', async () => {
  const ojson = OJSON.stringify(data);
  expect(typeof ojson).toBe('string');

  expect(OJSON.parse(ojson)).toStrictEqual(data);
});

it('should pack', async () => {
  expect(OJSON.pack(data)).toStrictEqual({
    t: 'object',
    v: {
      a: {
        t: 'number',
        v: 1.5,
      },
      aa: {
        t: 'string',
        v: 'string',
      },
      array: {
        t: 'array',
        v: [
          {
            t: 'bigint',
            v: '1',
          },
          {
            t: 'bigint',
            v: '2',
          },
        ],
      },
      b: {
        t: 'bigint',
        v: '1',
      },
      bb: {
        t: 'number',
        v: 1.5,
      },
      cc: {
        t: 'boolean',
        v: true,
      },
      dd: {
        t: 'array',
        v: [
          {
            t: 'string',
            v: 'a',
          },
          {
            t: 'number',
            v: 1.5,
          },
          {
            t: 'boolean',
            v: true,
          },
          {
            t: 'array',
            v: [],
          },
          {
            t: 'object',
            v: {},
          },
          {
            t: 'null',
            v: null,
          },
          {
            t: 'bigint',
            v: '5',
          },
        ],
      },
      ee: {
        t: 'object',
        v: {
          a: {
            t: 'bigint',
            v: '1',
          },
          b: {
            t: 'string',
            v: 'string',
          },
          c: {
            t: 'boolean',
            v: true,
          },
          d: {
            t: 'array',
            v: [],
          },
          e: {
            t: 'object',
            v: {},
          },
          f: {
            t: 'null',
            v: null,
          },
          g: {
            t: 'number',
            v: 5.5,
          },
        },
      },
      ff: {
        t: 'null',
        v: null,
      },
      gg: {
        t: 'bigint',
        v: '5',
      },
      object: {
        t: 'object',
        v: {
          c: {
            t: 'bigint',
            v: '1',
          },
        },
      },
      objects: {
        t: 'array',
        v: [
          {
            t: 'object',
            v: {
              d: {
                t: 'bigint',
                v: '1',
              },
            },
          },
          {
            t: 'object',
            v: {
              e: {
                t: 'bigint',
                v: '2',
              },
              f: {
                t: 'string',
                v: 'string',
              },
              g: {
                t: 'boolean',
                v: true,
              },
              h: {
                t: 'null',
                v: null,
              },
              i: {
                t: 'number',
                v: 99.95,
              },
              j: {
                t: 'bigint',
                v: '1',
              },
              k: {
                t: 'array',
                v: [
                  {
                    t: 'object',
                    v: {},
                  },
                ],
              },
              l: {
                t: 'object',
                v: {
                  m: {
                    t: 'bigint',
                    v: '1',
                  },
                  n: {
                    t: 'string',
                    v: 'ss',
                  },
                  o: {
                    t: 'boolean',
                    v: true,
                  },
                  p: {
                    t: 'array',
                    v: [],
                  },
                  q: {
                    t: 'object',
                    v: {},
                  },
                },
              },
            },
          },
        ],
      },
    },
  });
});

it('should pack and unpack', async () => {
  const packed = OJSON.pack(data);
  expect(typeof packed).toBe('object');

  expect(OJSON.unpack(packed)).toStrictEqual(data);
});

it('should not stringify Date', async () => {
  const date = new Date();

  // You can stringify a Date object
  expect(JSON.parse(JSON.stringify({ date: date }))).toStrictEqual({
    date: date.toJSON(),
  });

  // But you can't stringify a Date object with OJSON
  expect(() => OJSON.stringify(date)).toThrow();
});

it('should not stringify a class object', async () => {
  const obj = new (class {})();
  expect(() => OJSON.stringify(obj)).toThrow();
});

it('should not pack a class object', async () => {
  class Something {
    private readonly value: string = 'valuing';
  }

  expect(() => {
    OJSON.pack({ something: new Something() });
  }).toThrow(new Error(`Unsupported type: Something`));
});
