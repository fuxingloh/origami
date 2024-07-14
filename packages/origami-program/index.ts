import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createContext, runInContext } from 'node:vm';

import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import { rollup, RollupOptions } from 'rollup';

import { Subscribe, subscribeSchema } from './types';

export interface OrigamiProgram {
  version: 'v1';
  /**
   * Evaluated subscriptions.
   */
  subscribe: Subscribe;
  /**
   * Compiled program code.
   */
  code: string;
}

export class Compiler {
  private readonly options: RollupOptions = {
    plugins: [
      typescript({
        tsconfig: false,
        compilerOptions: {
          lib: ['ES2023'],
          target: 'ES2022',
          declaration: false,
          declarationMap: false,
          resolveJsonModule: true,
          skipLibCheck: true,
          allowSyntheticDefaultImports: true,
        },
      }),
      nodeResolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs({
        include: /node_modules/,
      }),
      json(),
      terser({
        compress: {
          drop_console: true,
          drop_debugger: true,
          unused: true,
          dead_code: true,
          evaluate: true,
        },
        ie8: false,
        safari10: false,
      }),
    ],
    treeshake: 'smallest',
    onLog(l, warning) {
      if (warning.code === 'UNRESOLVED_IMPORT') {
        throw new Error(
          `Unable to resolve import: '${warning.exporter}' in '${warning.id}'. Node.js builtins are not supported.`,
        );
      }
    },
  };

  /**
   * @param dir to store temporary files
   */
  constructor(private readonly dir = '.origami') {}

  async compile(file: string): Promise<OrigamiProgram> {
    file = file.replace(/\.ts$/, '');
    const fileId = createHash('sha256').update(file).digest('hex').slice(0, 16);
    const cwd = join(this.dir, fileId);
    await mkdir(cwd, { recursive: true });

    return {
      version: 'v1',
      subscribe: await this.evalSubscribe(file, cwd),
      code: await this.bundleCode(file, cwd),
    };
  }

  /**
   * Bundle `export function map()` as the entrypoint using rollup, tree-shake and minify the code.
   * If the program cannot be bundled, it will throw an error.
   */
  private async bundleCode(file: string, cwd: string): Promise<string> {
    const input = join(cwd, 'code.ts');
    await writeFile(input, `export { map } from '${file}';`);

    const bundle = await rollup({
      input: input,
      ...this.options,
    });

    const { output } = await bundle.generate({
      format: 'es',
      inlineDynamicImports: true,
      minifyInternalExports: true,
      compact: true,
    });

    return output[0].code;
  }

  /**
   * Evaluate the const subscribe value from the program.
   */
  private async evalSubscribe(file: string, cwd: string): Promise<Subscribe> {
    const input = join(cwd, 'subscribe.ts');
    await writeFile(input, `export { subscribe } from '${file}';`);

    const bundle = await rollup({
      input: input,
      ...this.options,
    });

    const { output } = await bundle.generate({
      format: 'cjs',
      inlineDynamicImports: true,
    });

    const exports: any = {};
    runInContext(output[0].code, createContext({ exports }));
    return subscribeSchema.parse(exports.subscribe);
  }
}
