import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { FileMigrationProvider, Migrator } from 'kysely';

export class ImagiroMigrationProvider extends FileMigrationProvider {
  constructor() {
    super({ fs: ImagiroMigrationProvider, path: ImagiroMigrationProvider, migrationFolder: __dirname });
  }

  /**
   * This checks the current file extension and filters the files based on the current file extension.
   */
  static async readdir(path: string): Promise<string[]> {
    const files = await readdir(path);
    const isJs = __filename.endsWith('.js');
    return files.filter((it) => (isJs ? it.endsWith('.js') : it.endsWith('.ts')));
  }

  static join(...path: string[]): string {
    return join(...path);
  }
}

export { Migrator };
