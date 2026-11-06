import type { Entity } from '@domain/entities';
import type { Repository } from '@domain/ports';

export type DeleteGuard = (id: string) => Promise<void>;

export class DeleteEntity<T extends Entity> {
  constructor(
    private readonly repository: Repository<T>,
    private readonly guards: readonly DeleteGuard[] = [],
  ) {}

  async execute(id: string): Promise<void> {
    for (const guard of this.guards) await guard(id);
    await this.repository.delete(id);
  }
}
