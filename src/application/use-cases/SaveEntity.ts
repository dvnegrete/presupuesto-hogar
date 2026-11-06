import type { Entity } from '@domain/entities';
import type { IdGenerator, Repository } from '@domain/ports';

/** Regla que debe cumplirse antes de persistir (p. ej. que la tarjeta referenciada exista). */
export type SaveGuard<T> = (entity: T) => Promise<void>;

export type SaveInput<T extends Entity> = Omit<T, 'id'> & { id?: string };

/**
 * Crea o actualiza una entidad. La validación de invariantes vive en la fábrica del dominio
 * y las reglas entre agregados en los guards, así el caso de uso no cambia al agregar reglas.
 */
export class SaveEntity<T extends Entity> {
  constructor(
    private readonly repository: Repository<T>,
    private readonly factory: (props: T) => T,
    private readonly ids: IdGenerator,
    private readonly guards: readonly SaveGuard<T>[] = [],
  ) {}

  async execute(input: SaveInput<T>): Promise<T> {
    const entity = this.factory({ ...input, id: input.id ?? this.ids.next() } as T);
    for (const guard of this.guards) await guard(entity);
    await this.repository.save(entity);
    return entity;
  }
}
