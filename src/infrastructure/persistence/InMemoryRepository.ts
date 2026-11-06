import type { Entity } from '@domain/entities';
import type { Repository } from '@domain/ports';

/** Adaptador en memoria: pruebas y modo demo. */
export class InMemoryRepository<T extends Entity> implements Repository<T> {
  private readonly items = new Map<string, T>();

  constructor(seed: readonly T[] = []) {
    seed.forEach((e) => this.items.set(e.id, e));
  }

  async findAll(): Promise<T[]> {
    return [...this.items.values()];
  }

  async findById(id: string): Promise<T | undefined> {
    return this.items.get(id);
  }

  async save(entity: T): Promise<void> {
    this.items.set(entity.id, entity);
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }

  async replaceAll(entities: readonly T[]): Promise<void> {
    this.items.clear();
    entities.forEach((e) => this.items.set(e.id, e));
  }
}
