import { BIP122BlockStream } from '@imagiro/stream-bip122/block';
import { BIP122TxStream } from '@imagiro/stream-bip122/tx';
import { Stream } from '@imagiro/stream-core';
import { HardhatBlockStream, HardhatLogStream, HardhatTxStream } from '@imagiro/stream-eip155/hardhat';
import debug0 from 'debug';

const debug = debug0('imagiro:stream:registry');

export type AnyStream = Stream<any, any, any>;

export class StreamRegistry {
  private readonly map: Map<string, AnyStream> = new Map();

  getReader(usi: string): Stream<any, any, any> {
    if (this.map.has(usi)) {
      return this.map.get(usi)!;
    }

    const reader = this.createReader(usi);
    if (reader === undefined) {
      throw new Error(`StreamReader with USI: ${usi} not registered`);
    }

    this.map.set(usi, reader);
    return reader;
  }

  private createReader(usi: string): AnyStream | undefined {
    switch (usi) {
      case 'eip155:31337/block':
      case 'eip155:1337/block':
        return new HardhatBlockStream(usi, this.getOptions(usi));
      case 'eip155:31337/log':
      case 'eip155:1337/log':
        return new HardhatLogStream(usi, this.getOptions(usi));
      case 'eip155:31337/tx':
      case 'eip155:1337/tx':
        return new HardhatTxStream(usi, this.getOptions(usi));
      case 'bip122:0f9188f13cb7b2c71f2a335e3a4fc328/block':
        return new BIP122BlockStream(usi, this.getOptions(usi));
      case 'bip122:0f9188f13cb7b2c71f2a335e3a4fc328/tx':
        return new BIP122TxStream(usi, this.getOptions(usi));
      default:
        return undefined;
    }
  }

  /**
   * You can either declare the USI options either via individual env or a grouped env variable.
   * The individual env variables have precedence over the grouped env variable.
   * - process.env.STREAM_REGISTRY_USI:eip155:31337/block = 'opts'
   * - process.env.STREAM_REGISTRY_USI = '{"eip155:31337/block": opts}'
   * @param usi
   * @private
   */
  private getOptions<Opts>(usi: string): Opts {
    const single = process.env[`STREAM_REGISTRY_USI:${usi}`];
    if (single !== undefined) {
      return JSON.parse(single);
    }

    const grouped: Record<string, Opts> = JSON.parse(process.env.STREAM_REGISTRY_USI ?? '{}');
    if (grouped[usi] !== undefined) {
      return grouped[usi];
    }

    debug('options for %s not found in environment variables', usi);
    throw new Error(`Options for ${usi} not found in environment variables`);
  }
}
