import { FetchHttpRequest } from './core/FetchHttpRequest';
import { RpcService } from './services/RpcService';

export interface OrigamiClientConfig {
  endpoint?: string;
  token?: string;
  headers?: Record<string, string>;
}

export class OrigamiClient {
  private readonly request: FetchHttpRequest;
  public readonly rpc: RpcService;

  constructor(config?: OrigamiClientConfig) {
    this.request = new FetchHttpRequest({
      VERSION: '0.0.0',
      WITH_CREDENTIALS: false,
      CREDENTIALS: 'same-origin',
      BASE: config?.endpoint ?? 'https://origami.fuxing.dev/api',
      TOKEN: config?.token,
      HEADERS: config?.headers,
    });

    this.rpc = new RpcService(this.request);
  }
}
