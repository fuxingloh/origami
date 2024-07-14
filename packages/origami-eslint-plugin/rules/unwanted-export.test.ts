import { RuleTester } from 'eslint';

import rule from './unwanted-export';

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('unwanted-export', rule, {
  valid: [
    {
      code: `
        import { Subscribe, Event } from '@fuxingloh/origami/program';

        export const subscribe: Subscribe = [
          'eip155:1/block',
        ];

        export function map(data: any, event: Event) {
          return {
            height: data.height,
          };
        }
      `,
    },
    {
      // language=TypeScript
      code: `
        export const subscribe = ['eip155:1/block'];

        export function map(data) {
          return {
            hash: data.hash,
          };
        }
      `,
    },
    {
      // language=TypeScript
      code: `
        export const subscribe = [
          'eip155:1/block',
        ];

        function map2(data: any) {
          return 'something_else';
        }

        export function map(data: any) {
          if (data.number === 1) {
            return map2(data);
          }

          return {
            height: data.height,
          };
        }
      `,
    },
  ],
  invalid: [
    {
      // language=JavaScript
      code: `
        export const only = [];
      `,
      errors: [{ message: 'Only `function map` and `const subscribe` are allowed.' }],
    },
    {
      // language=TypeScript
      code: `
        export const other = '';

        export const subscribe = [
          'eip155:1/tx',
        ];

        export function map(data: any) {
          return {
            height: data.height,
          };
        }
      `,
      errors: [{ message: 'Only `function map` and `const subscribe` are allowed.' }],
    },
    {
      // language=TypeScript
      code: `
        export const subscribe = ['eip155:1/block',];

        export function other() {
          return 'other';
        }

        export function map(data: any) {
          return {
            height: data.height,
          };
        }
      `,
      errors: [{ message: 'Only `function map` and `const subscribe` are allowed.' }],
    },
  ],
});
