import { RuleTester } from 'eslint';

import rule from './invalid-subscribe';

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('invalid-subscribe', rule, {
  valid: [
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
        export const subscribe = ["eip155:1/block", "eip155:56/block"]

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
        export const subscribe: string[] = ["eip155:1/block", "eip155:56/block"]

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
          {
            usi: 'eip155:1/block',
          },
        ];

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
          'eip155:1337/block',
          {
            usi: 'eip155:1/block',
          },
        ];

        export function map(data) {
          return {
            hash: data.hash,
          };
        }
      `,
    },
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
  ],
  invalid: [
    {
      // language=TypeScript
      code: `
        export const subscribe = {};

        export function map(data: any) {
          return {
            hash: data.hash,
          };
        }
      `,
      errors: [{ message: '`subscribe` must be an array of valid Subscription or USI' }],
    },
  ],
});
