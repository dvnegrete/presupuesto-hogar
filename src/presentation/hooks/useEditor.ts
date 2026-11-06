import { useState } from 'react';

/** Estado de un diálogo de alta/edición: `null` cerrado, `{}` nuevo, entidad = editando. */
export const useEditor = <T>() => {
  const [target, setTarget] = useState<Partial<T> | null>(null);
  return {
    target,
    isOpen: target !== null,
    isNew: target !== null && !(target as { id?: string }).id,
    openNew: (defaults: Partial<T> = {}) => setTarget(defaults),
    openEdit: (entity: T) => setTarget(entity as Partial<T>),
    close: () => setTarget(null),
  };
};
