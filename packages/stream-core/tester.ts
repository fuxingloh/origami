import { NextSignal, Stream } from './index';

/**
 * Tester to be attached to a raw stream
 * Provide a getCheckpoint function which is implemented by upstream of this package.
 */
export class StreamTester<Header, Data, Config> {
  private signals: NextSignal<Header, Data>[] = [];

  public constructor(
    private readonly stream: Stream<Header, Data, Config>,
    private readonly config: Config,
  ) {}

  public async getCheckpoint(): Promise<Header | undefined> {
    for (let i = this.signals.length - 1; i >= 0; ) {
      const signal = this.signals[i];

      if (signal.type === 'event') {
        return signal.header;
      }

      if (signal.type === 'header') {
        return signal.header;
      }

      if (signal.type === 'fork') {
        i -= 2;
      }

      if (signal.type === 'sleep') {
        i -= 1;
      }

      if (signal.type === 'error') {
        i -= 1;
      }
    }
  }

  public async read(): Promise<NextSignal<Header, Data>> {
    let header: Header | undefined = await this.getCheckpoint();

    if (header === undefined) {
      const first = await this.stream.getFirst(this.config);
      if (first.type !== 'header') {
        return first;
      }
      header = first.header;
    }

    const signal = await this.stream.getNext(this.config, header);
    this.signals.push(signal);
    return signal;
  }
}
