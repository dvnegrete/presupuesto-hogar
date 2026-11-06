import type { Entity } from '@domain/entities';
import { DomainError } from '@domain/errors/DomainError';
import type { Repository } from '@domain/ports';
import type { DeleteGuard } from './DeleteEntity';
import type { SaveGuard } from './SaveEntity';

/** Al guardar: la entidad referenciada debe existir. */
export const referenceMustExist =
  <T, R extends Entity>(target: Repository<R>, refId: (entity: T) => string, message: string): SaveGuard<T> =>
  async (entity) => {
    if (!(await target.findById(refId(entity)))) throw new DomainError(message);
  };

/** Al borrar: no debe haber entidades que la referencien. */
export const notReferencedBy =
  <R extends Entity>(source: Repository<R>, refId: (entity: R) => string, message: (count: number) => string): DeleteGuard =>
  async (id) => {
    const count = (await source.findAll()).filter((e) => refId(e) === id).length;
    if (count > 0) throw new DomainError(message(count));
  };
