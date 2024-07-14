import { join } from 'node:path';

import { expect, it } from '@jest/globals';

import { Compiler } from './index';

const compiler = new Compiler();

it('should compile program', async () => {
  const file = join(__dirname, 'tests', 'program.origami.ts');
  const program = await compiler.compile(file);

  expect(program).toEqual({
    version: 'v1',
    subscribe: [
      {
        from: 0,
        usi: 'eip155:1/block',
      },
    ],
    code: 'function h(h){return{hash:h.hash}}export{h as map};',
  });
});

it.each([
  'baseline.origami.ts',
  'async.origami.ts',
  'return-array.origami.ts',
  'multi-chain.origami.ts',
  'conditional.origami.ts',
  'erc20.origami.ts',
  'import-abi.origami.ts',
  'terser.origami.ts',
  'default-export.origami.ts',
])('should compile %s', async (file) => {
  const inputFile = join(__dirname, 'tests', file);
  const program = await compiler.compile(inputFile);
  expect(program).toMatchSnapshot();
});

it.each(['openzeppelin.origami.ts', 'viem.origami.ts', 'viem-large.origami.ts'])(
  'should compile with external dependency %s',
  async (file) => {
    const inputFile = join(__dirname, 'tests', file);
    const program = await compiler.compile(inputFile);

    // External dependency cause the code to change, hence we don't check them against a snapshot
    expect(program).toEqual({
      version: 'v1',
      subscribe: expect.any(Array),
      code: expect.any(String),
    });
  },
);

it.each([
  {
    file: 'fail.import-path.origami.ts',
    error: {
      message: expect.stringContaining("Unable to resolve import: 'path' in "),
    },
  },
  {
    file: 'fail.import-node-path.origami.ts',
    error: {
      message: expect.stringContaining("Unable to resolve import: 'node:path' in "),
    },
  },
  {
    file: 'fail.usi.origami.ts',
    error: {
      issues: [
        expect.objectContaining({
          code: 'invalid_string',
          path: [0, 'usi'],
        }),
      ],
    },
  },
  {
    file: 'fail.from.origami.ts',
    error: {
      issues: expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid_type',
          path: [0, 'from'],
        }),
      ]),
    },
  },
])('should fail to compile $file', async ({ file, error }) => {
  const inputFile = join(__dirname, 'tests', file);
  await expect(compiler.compile(inputFile)).rejects.toMatchObject(error);
});
