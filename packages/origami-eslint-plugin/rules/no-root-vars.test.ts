import { RuleTester } from 'eslint';

import rule from './no-root-vars';

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('no-root-vars', rule, {
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
        function foo() {
          let bar;
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
  ],
  invalid: [
    {
      // language=JavaScript
      code: `
        let bar;
      `,
      errors: [{ message: 'Declaring variables at the root level can cause unwanted side effects.' }],
    },
    {
      // language=TypeScript
      code: `
        const abc = 'declaration';

        export const subscribe = [
          'eip155:1/block',
        ];

        export function map(data) {
          return {
            hash: data.hash,
          };
        }
      `,
      errors: [{ message: 'Declaring variables at the root level can cause unwanted side effects.' }],
    },
  ],
});
