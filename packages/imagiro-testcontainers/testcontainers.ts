import { randomBytes } from 'node:crypto';
import { join } from 'node:path';

import { OrigamiClient } from '@fuxingloh/origami/client';
import { Compiler } from '@fuxingloh/origami-program';
import { DockerComposeEnvironment, StartedDockerComposeEnvironment, StartedTestContainer } from 'testcontainers';

import { version } from './package.json';

export class ImagiroTestcontainers {
  private readonly composeInstanceId: string = randomBytes(4).toString('hex');
  private readonly streamRegistryUsi: Record<string, any> = {};
  private readonly environment: Record<string, string | undefined> = {
    SERVICE_IAM_MODE: 'None',
    SERVICE_IAM_ENDPOINT: '',
  };

  withUSI(usi: string, options: any): this {
    this.streamRegistryUsi[usi] = options;
    return this;
  }

  getUSI(): string {
    return JSON.stringify(this.streamRegistryUsi);
  }

  withIam(mode: 'Federated' | 'None', endpoint?: string): this {
    this.environment['SERVICE_IAM_MODE'] = mode;
    this.environment['SERVICE_IAM_ENDPOINT'] = endpoint ?? '';
    return this;
  }

  async start(): Promise<StartedImagiroTestcontainers> {
    const started = await new DockerComposeEnvironment(__dirname, 'compose.yml')
      .withEnvironment({
        COMPOSE_INSTANCE_ID: this.composeInstanceId,
        IMAGIRO_VERSION: version,
        STREAM_REGISTRY_USI: JSON.stringify(this.streamRegistryUsi).replaceAll('$', '$$$'),
        ...this.environment,
      })
      .withStartupTimeout(120000)
      .up();

    return new StartedImagiroTestcontainers(this.composeInstanceId, started);
  }
}

export class StartedImagiroTestcontainers {
  private readonly compiler = new Compiler();
  public readonly client: OrigamiClient;

  constructor(
    private readonly composeInstanceId: string,
    private readonly composeEnvironment: StartedDockerComposeEnvironment,
  ) {
    this.client = new OrigamiClient({ endpoint: this.getServiceEndpoint() });
  }

  async stop(): Promise<void> {
    await this.composeEnvironment.down();
  }

  getContainer(name: string): StartedTestContainer {
    return this.composeEnvironment.getContainer(`${name}-${this.composeInstanceId}`);
  }

  getServiceEndpoint(): string {
    const container = this.getContainer('imagiro-service');
    return `http://${container.getHost()}:${container.getMappedPort(3000)}`;
  }

  async deploy(dirname: string, filename: string): Promise<{ programId: string }> {
    const program = await this.compiler.compile(join(dirname, filename));
    const { programId } = await this.client.rpc.programCreate(program);
    await this.client.rpc.programStart({ programId });
    return { programId };
  }

  async waitForStream(programId: string, gte: number, timeout: number = 10000, sleep: number = 200): Promise<void> {
    const startTime = Date.now();
    let length = 0;

    while (Date.now() - startTime < timeout) {
      const result = await this.client.rpc.streamQuery({
        programId: programId,
        limit: 100,
      });
      length = result.data.length;

      if (length >= gte) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, sleep));
    }

    throw new Error(`Timeout of ${timeout}ms exceeded before the condition was met. (${length} >= ${gte})`);
  }
}
