export const subscribe = [{ usi: 'eip155:1/block' }];

export function map(block: any) {
  return {
    hash: block.hash,
  };
}

export default function () {
  console.log('this will be removed');
}
