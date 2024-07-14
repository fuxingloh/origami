// noinspection PointlessBooleanExpressionJS,UnreachableCodeJS
/* eslint-disable */

import { EIP155Block, Subscribe } from '../types';

export const subscribe: Subscribe = [
  {
    usi: 'eip155:31337/block',
  },
];

export function map(block: EIP155Block): any {
  console.log('Stripped');
  const constant = 1024 * 100;
  const notUsed = 0;
  let a = 'a';

  if (false) {
    a = 'b';
  }

  return {
    number: block.number,
    a: a,
    kb: constant,
  };
}

function unused() {
  console.log('Unused');
}
