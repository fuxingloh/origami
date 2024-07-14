import { existsSync } from 'node:fs';

import { OrigamiClient } from '@fuxingloh/origami-client';
import { Compiler } from '@fuxingloh/origami-program';
import { Command, Option } from 'clipanion';

abstract class BaseCommand extends Command {
  private readonly endpoint: string | undefined = Option.String('--endpoint', {
    required: false,
  });

  private readonly token: string | undefined = Option.String('--token', {
    required: false,
  });

  get client() {
    return new OrigamiClient({
      endpoint: this.endpoint,
      token: this.token,
    });
  }
}

export class DeployProgramCommand extends BaseCommand {
  private readonly compiler = new Compiler();

  static paths = [[`deploy`]];

  static usage = Command.Usage({
    description: `Deploy a origami program by providing the file path.`,
    details: `
      This command will compile and deploy a origami program by providing the file path.
    `,
  });

  private readonly filename: string = Option.String('--file', { required: true });

  async execute() {
    if (!existsSync(this.filename)) {
      this.context.stdout.write(`${this.filename} not found\n`);
      return;
    }

    const program = await this.compiler.compile(this.filename);
    const { programId } = await this.client.rpc.programCreate(program);
    this.context.stdout.write(`Provisioned program: ${programId}\n`);
  }
}
