export type Packed =
  | { t: 'null'; v: null }
  | { t: 'bigint'; v: string }
  | { t: 'number'; v: number }
  | { t: 'string'; v: string }
  | { t: 'boolean'; v: boolean }
  | { t: 'object'; v: { [key: string]: Packed } }
  | { t: 'array'; v: Packed[] };

export function pack(value: any): Packed {
  if (Array.isArray(value)) {
    return { t: 'array', v: value.map(pack) };
  }
  if (value === null) {
    return { t: 'null', v: null };
  }

  switch (typeof value) {
    case 'bigint':
      return { t: 'bigint', v: value.toString(10) };
    case 'number':
      return { t: 'number', v: value };
    case 'string':
      return { t: 'string', v: value };
    case 'boolean':
      return { t: 'boolean', v: value };
  }

  if (typeof value === 'object') {
    // We don't support Class
    if (value.constructor.name !== 'Object') {
      throw new Error(`Unsupported type: ${value.constructor.name}`);
    }

    const obj: any = {};
    for (const key in value) {
      obj[key] = pack(value[key]);
    }
    return { t: 'object', v: obj };
  }

  throw new Error(`Unsupported type: ${typeof value}`);
}

export function unpack(packed: Packed): any {
  switch (packed.t) {
    case 'array':
      return packed.v.map(unpack);
    case 'object':
      return Object.entries(packed.v).reduce((acc, [key, value]) => {
        acc[key] = unpack(value);
        return acc;
      }, {} as any);
    case 'null':
      return null;
    case 'bigint':
      return BigInt(packed.v);
    case 'number':
      return packed.v;
    case 'string':
      return packed.v;
    case 'boolean':
      return packed.v;
    default:
      throw new Error(`Unsupported type: ${JSON.stringify(packed)}`);
  }
}

function stringify(value: any): string {
  return JSON.stringify(pack(value));
}

function parse(ojson: string): any {
  return unpack(JSON.parse(ojson));
}

/**
 * Origami JavaScript Object Notation (OJSON)
 *
 * A JSON standard with type information for safe unidirectional serialization and deserialization.
 * This implementation avoids custom binary/string encoding/decoding
 * and instead focuses on simplicity and native performance.
 */
const OJSON = {
  pack,
  unpack,
  stringify,
  parse,
};

export default OJSON;
