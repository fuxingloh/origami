import { z } from 'zod';

export { z };

/**
 * A Zod parser, the input is partial to the output type.
 */
export type ZodParser<T> = z.ZodSchema<T, z.ZodTypeDef, Partial<T>>;

export abstract class Stream<Header, Data, Config> {
  protected constructor(public readonly usi: string) {}

  public abstract readonly headerParser: ZodParser<Header>;

  public abstract readonly dataParser: ZodParser<Data>;

  /**
   * This is only called when there isn't any previous header within the stream
   * to read the first header.
   */
  public abstract getFirst(config: Config): Promise<FirstSignal<Header>>;

  /**
   * This is called after the first header is read to get all subsequent signals.
   */
  public abstract getNext(config: Config, prev: Header): Promise<NextSignal<Header, Data>>;

  public sleep(): SleepSignal {
    return { type: 'sleep' };
  }

  /**
   * Create an error signal.
   * This is NOT NECESSARILY, the stream can throw an error and let the runtime handle it.
   * However, if you `try catch` in the stream, you must handle the error properly to avoid unwanted side effects.
   */
  public error(error: Error): ErrorSignal {
    return { type: 'error', error };
  }

  public fork(options: { header: Header }): ForkSignal<Header> {
    const header = this.headerParser.parse(options.header);
    return {
      type: 'fork',
      header: header,
    };
  }

  public header(options: { header: Header; sequence: bigint }): HeaderSignal<Header> {
    const header = this.headerParser.parse(options.header);
    return {
      type: 'header',
      header: header,
      sequence: options.sequence,
    };
  }

  public event(options: { header: Header; data: any; sequence: bigint; timestamp: number }): EventSignal<Header, Data> {
    const header = this.headerParser.parse(options.header);
    const data = this.dataParser.parse(options.data);

    return {
      type: 'event',
      header: header,
      data: data,
      sequence: options.sequence,
      timestamp: options.timestamp,
    };
  }

  public completed(): CompletedSignal {
    return { type: 'completed' };
  }
}

export type FirstSignal<Header> = HeaderSignal<Header> | SleepSignal | ErrorSignal;

export type NextSignal<Header, Data> =
  | HeaderSignal<Header>
  | EventSignal<Header, Data>
  | ForkSignal<Header>
  | CompletedSignal
  | SleepSignal
  | ErrorSignal;

/**
 * A signal that indicates the stream has reached a checkpoint.
 */
export interface CheckpointSignal<Header> {
  sequence: bigint;
  header: Header;
}

export interface HeaderSignal<Header> extends CheckpointSignal<Header> {
  type: 'header';
}

export interface EventSignal<Header, Data> extends CheckpointSignal<Header> {
  type: 'event';
  data: Data;
  timestamp: number;
}

export interface ForkSignal<Header> {
  type: 'fork';
  header: Header;
}

export interface CompletedSignal {
  type: 'completed';
}

export interface SleepSignal {
  type: 'sleep';
}

export interface ErrorSignal {
  type: 'error';
  error: Error;
}
